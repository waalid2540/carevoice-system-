import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("render.com") || connectionString.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { id: "demo-org-001" },
    update: {},
    create: {
      id: "demo-org-001",
      name: "Sunshine Adult Day Care",
      timezone: "America/New_York",
      subscriptionStatus: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
  });

  console.log(`Created organization: ${org.name}`);

  // Create rooms
  const mainRoom = await prisma.room.upsert({
    where: { id: "room-main-001" },
    update: {},
    create: {
      id: "room-main-001",
      name: "Main Activity Room",
      organizationId: org.id,
    },
  });

  const quietRoom = await prisma.room.upsert({
    where: { id: "room-quiet-001" },
    update: {},
    create: {
      id: "room-quiet-001",
      name: "Quiet Room",
      organizationId: org.id,
    },
  });

  console.log(`Created rooms: ${mainRoom.name}, ${quietRoom.name}`);

  // Create devices
  const device1 = await prisma.device.upsert({
    where: { id: "device-001" },
    update: {},
    create: {
      id: "device-001",
      name: "Main Room TV",
      roomId: mainRoom.id,
      organizationId: org.id,
      pairingCode: "123456",
      pairingExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      status: "PENDING",
    },
  });

  const device2 = await prisma.device.upsert({
    where: { id: "device-002" },
    update: {},
    create: {
      id: "device-002",
      name: "Quiet Room Tablet",
      roomId: quietRoom.id,
      organizationId: org.id,
      pairingCode: "654321",
      pairingExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      status: "PENDING",
    },
  });

  console.log(`Created devices: ${device1.name}, ${device2.name}`);

  // Create announcements
  const exerciseAnnouncement = await prisma.announcement.upsert({
    where: { id: "announcement-exercise" },
    update: {},
    create: {
      id: "announcement-exercise",
      title: "Morning Exercise",
      type: "TTS",
      text: "Good morning everyone! It's time for our morning exercise. Please stand up and follow along with the exercises.",
      language: "en-US",
      organizationId: org.id,
    },
  });

  const lunchAnnouncement = await prisma.announcement.upsert({
    where: { id: "announcement-lunch" },
    update: {},
    create: {
      id: "announcement-lunch",
      title: "Lunch Time",
      type: "TTS",
      text: "Attention everyone. Lunch is now being served in the dining area. Please make your way to the dining room.",
      language: "en-US",
      organizationId: org.id,
    },
  });

  const breakAnnouncement = await prisma.announcement.upsert({
    where: { id: "announcement-break" },
    update: {},
    create: {
      id: "announcement-break",
      title: "Break Time",
      type: "TTS",
      text: "It's break time! Feel free to relax, stretch, or have a snack.",
      language: "en-US",
      organizationId: org.id,
    },
  });

  const napAnnouncement = await prisma.announcement.upsert({
    where: { id: "announcement-nap" },
    update: {},
    create: {
      id: "announcement-nap",
      title: "Nap Time",
      type: "TTS",
      text: "It's time for a rest. Please find a comfortable spot and relax.",
      language: "en-US",
      organizationId: org.id,
    },
  });

  const cleanupAnnouncement = await prisma.announcement.upsert({
    where: { id: "announcement-cleanup" },
    update: {},
    create: {
      id: "announcement-cleanup",
      title: "Clean Up Time",
      type: "TTS",
      text: "Clean up time! Please help tidy up the room and put away any materials.",
      language: "en-US",
      organizationId: org.id,
    },
  });

  console.log("Created announcements");

  // Create schedule
  const dailySchedule = await prisma.schedule.upsert({
    where: { id: "schedule-daily" },
    update: {},
    create: {
      id: "schedule-daily",
      name: "Daily Schedule",
      active: true,
      organizationId: org.id,
    },
  });

  console.log(`Created schedule: ${dailySchedule.name}`);

  // Create schedule items (weekdays: Mon-Fri = 1,2,3,4,5)
  const weekdays = [1, 2, 3, 4, 5];

  const scheduleItems = [
    {
      id: "item-exercise",
      scheduleId: dailySchedule.id,
      roomId: null, // All rooms
      timeOfDay: "09:00",
      daysOfWeek: weekdays,
      announcementId: exerciseAnnouncement.id,
      enabled: true,
      order: 1,
    },
    {
      id: "item-break-morning",
      scheduleId: dailySchedule.id,
      roomId: null,
      timeOfDay: "10:30",
      daysOfWeek: weekdays,
      announcementId: breakAnnouncement.id,
      enabled: true,
      order: 2,
    },
    {
      id: "item-lunch",
      scheduleId: dailySchedule.id,
      roomId: null,
      timeOfDay: "12:00",
      daysOfWeek: weekdays,
      announcementId: lunchAnnouncement.id,
      enabled: true,
      order: 3,
    },
    {
      id: "item-nap",
      scheduleId: dailySchedule.id,
      roomId: quietRoom.id, // Only quiet room
      timeOfDay: "13:00",
      daysOfWeek: weekdays,
      announcementId: napAnnouncement.id,
      enabled: true,
      order: 4,
    },
    {
      id: "item-break-afternoon",
      scheduleId: dailySchedule.id,
      roomId: null,
      timeOfDay: "15:00",
      daysOfWeek: weekdays,
      announcementId: breakAnnouncement.id,
      enabled: true,
      order: 5,
    },
    {
      id: "item-cleanup",
      scheduleId: dailySchedule.id,
      roomId: null,
      timeOfDay: "16:30",
      daysOfWeek: weekdays,
      announcementId: cleanupAnnouncement.id,
      enabled: true,
      order: 6,
    },
  ];

  for (const item of scheduleItems) {
    await prisma.scheduleItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }

  console.log("Created schedule items");

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
