import pg from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL required");
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const sql = `
-- CareVoice Tables (cv_ prefix)

-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE cv_user_role AS ENUM ('OWNER', 'ADMIN', 'STAFF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE cv_subscription_status AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE cv_announcement_type AS ENUM ('TTS', 'MP3');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE cv_device_status AS ENUM ('PENDING', 'PAIRED', 'OFFLINE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE cv_play_status AS ENUM ('SCHEDULED', 'PLAYED', 'SKIPPED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organizations
CREATE TABLE IF NOT EXISTS cv_organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  "subscriptionStatus" cv_subscription_status NOT NULL DEFAULT 'TRIAL',
  "stripeCustomerId" TEXT UNIQUE,
  "stripeSubscriptionId" TEXT,
  "trialEndsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS cv_users (
  id TEXT PRIMARY KEY,
  "clerkId" TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  role cv_user_role NOT NULL DEFAULT 'STAFF',
  "organizationId" TEXT NOT NULL REFERENCES cv_organizations(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Rooms
CREATE TABLE IF NOT EXISTS cv_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "organizationId" TEXT NOT NULL REFERENCES cv_organizations(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Devices
CREATE TABLE IF NOT EXISTS cv_devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "roomId" TEXT REFERENCES cv_rooms(id) ON DELETE SET NULL,
  "organizationId" TEXT NOT NULL REFERENCES cv_organizations(id) ON DELETE CASCADE,
  "pairingCode" TEXT UNIQUE,
  "pairingExpiresAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  status cv_device_status NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Announcements
CREATE TABLE IF NOT EXISTS cv_announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type cv_announcement_type NOT NULL,
  text TEXT,
  "audioUrl" TEXT,
  language TEXT NOT NULL DEFAULT 'en-US',
  voice TEXT,
  "organizationId" TEXT NOT NULL REFERENCES cv_organizations(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Schedules
CREATE TABLE IF NOT EXISTS cv_schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  "organizationId" TEXT NOT NULL REFERENCES cv_organizations(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Schedule Items
CREATE TABLE IF NOT EXISTS cv_schedule_items (
  id TEXT PRIMARY KEY,
  "scheduleId" TEXT NOT NULL REFERENCES cv_schedules(id) ON DELETE CASCADE,
  "roomId" TEXT REFERENCES cv_rooms(id) ON DELETE SET NULL,
  "timeOfDay" TEXT NOT NULL,
  "daysOfWeek" INTEGER[] NOT NULL,
  "announcementId" TEXT NOT NULL REFERENCES cv_announcements(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Emergency Broadcasts
CREATE TABLE IF NOT EXISTS cv_emergency_broadcasts (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES cv_organizations(id) ON DELETE CASCADE,
  "announcementId" TEXT NOT NULL REFERENCES cv_announcements(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Play Logs
CREATE TABLE IF NOT EXISTS cv_play_logs (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES cv_organizations(id) ON DELETE CASCADE,
  "roomId" TEXT REFERENCES cv_rooms(id) ON DELETE SET NULL,
  "deviceId" TEXT REFERENCES cv_devices(id) ON DELETE SET NULL,
  "announcementId" TEXT REFERENCES cv_announcements(id) ON DELETE SET NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "playedAt" TIMESTAMP(3),
  status cv_play_status NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS cv_audit_logs (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES cv_organizations(id) ON DELETE CASCADE,
  "userId" TEXT,
  action TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "oldValue" JSONB,
  "newValue" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS cv_organizations_stripe_idx ON cv_organizations("stripeCustomerId");
CREATE INDEX IF NOT EXISTS cv_users_org_idx ON cv_users("organizationId");
CREATE INDEX IF NOT EXISTS cv_users_clerk_idx ON cv_users("clerkId");
CREATE INDEX IF NOT EXISTS cv_rooms_org_idx ON cv_rooms("organizationId");
CREATE INDEX IF NOT EXISTS cv_devices_org_idx ON cv_devices("organizationId");
CREATE INDEX IF NOT EXISTS cv_devices_pairing_idx ON cv_devices("pairingCode");
CREATE INDEX IF NOT EXISTS cv_announcements_org_idx ON cv_announcements("organizationId");
CREATE INDEX IF NOT EXISTS cv_schedules_org_idx ON cv_schedules("organizationId");
CREATE INDEX IF NOT EXISTS cv_schedule_items_schedule_idx ON cv_schedule_items("scheduleId");
`;

async function main() {
  console.log("Creating CareVoice tables...");
  
  try {
    await pool.query(sql);
    console.log("✅ Tables created successfully!");
    
    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'cv_%'
      ORDER BY table_name
    `);
    
    console.log("\nCareVoice tables:");
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

main();
