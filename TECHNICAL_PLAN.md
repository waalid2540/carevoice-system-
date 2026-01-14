# CareVoice Technical Plan

## Executive Summary
CareVoice is a multi-tenant SaaS platform for adult day care and child care centers to schedule and play audio announcements on TVs/tablets in rooms. Target: 2,000 businesses with multiple rooms/devices each.

---

## 1. MVP Scope vs Phase 2 Features

### MVP (Must-Have)
- [ ] Multi-tenant organization structure
- [ ] User authentication with roles (Owner/Admin/Staff)
- [ ] Room management (CRUD)
- [ ] Device management with pairing system
- [ ] Announcement creation (TTS + MP3 upload)
- [ ] Schedule builder with time/day selection
- [ ] Fullscreen player for TV/tablet devices
- [ ] Device polling (60s) + offline caching
- [ ] Basic Stripe billing ($29.99/mo)
- [ ] Health check endpoint
- [ ] Render deployment

### Phase 2 Features
- [ ] Emergency broadcast system
- [ ] Play logs and analytics dashboard
- [ ] Multi-language TTS (server-side)
- [ ] Custom announcement recordings
- [ ] Schedule templates library
- [ ] Device groups
- [ ] API access for integrations
- [ ] Mobile admin app
- [ ] White-label branding
- [ ] Advanced reporting/exports
- [ ] Slack/Email notifications
- [ ] Calendar integration
- [ ] Holiday schedules
- [ ] Volume scheduling by time

---

## 2. Multi-Tenant Architecture

```
Organization (Tenant)
├── Users (Owner, Admins, Staff)
├── Rooms
│   └── Devices (TV/Tablet)
├── Announcements (TTS/MP3)
├── Schedules
│   └── ScheduleItems
├── EmergencyBroadcasts
└── PlayLogs
```

### Data Isolation Strategy
- Every table includes `organizationId` foreign key
- All queries filter by `organizationId` from authenticated session
- Row-Level Security pattern via Prisma middleware
- API endpoints validate org membership before data access

---

## 3. Device Player Model

### Polling Architecture
```
Device (TV/Tablet)
    │
    ├── GET /api/player/schedule (every 60s)
    │   └── Returns: timezone, today's items, announcement data
    │
    ├── GET /api/player/emergency (every 15s)
    │   └── Returns: active emergency broadcast if any
    │
    └── POST /api/player/heartbeat (every 60s)
        └── Updates: device.lastSeenAt
```

### Offline Fallback
1. Cache schedule JSON in localStorage with date key
2. On fetch failure, load cached schedule
3. Continue playing announcements from cache
4. Show "Offline" indicator on player UI
5. Resume sync when connection restored

### Audio Playback
- **MP3**: HTMLAudioElement with preloading
- **TTS**: Browser SpeechSynthesis API (fallback to server TTS later)

---

## 4. Recommended Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ App Router |
| Language | TypeScript (strict mode) |
| Styling | TailwindCSS + shadcn/ui |
| ORM | Prisma |
| Database | PostgreSQL (Render) |
| Auth | Clerk |
| Payments | Stripe |
| Storage | Cloudflare R2 (S3-compatible) |
| Hosting | Render Web Service |

---

## 5. Database Schema

### Tables & Relations

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  OWNER
  ADMIN
  STAFF
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELED
}

enum AnnouncementType {
  TTS
  MP3
}

enum DeviceStatus {
  PENDING
  PAIRED
  OFFLINE
}

enum PlayStatus {
  SCHEDULED
  PLAYED
  SKIPPED
  FAILED
}

model Organization {
  id                 String             @id @default(cuid())
  name               String
  timezone           String             @default("America/New_York")
  subscriptionStatus SubscriptionStatus @default(TRIAL)
  stripeCustomerId   String?
  stripeSubscriptionId String?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  users              User[]
  rooms              Room[]
  devices            Device[]
  announcements      Announcement[]
  schedules          Schedule[]
  emergencyBroadcasts EmergencyBroadcast[]
  playLogs           PlayLog[]
  auditLogs          AuditLog[]

  @@index([stripeCustomerId])
}

model User {
  id             String       @id @default(cuid())
  clerkId        String       @unique
  email          String
  name           String?
  role           UserRole     @default(STAFF)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([organizationId])
  @@index([clerkId])
}

model Room {
  id             String       @id @default(cuid())
  name           String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  devices        Device[]
  scheduleItems  ScheduleItem[]
  playLogs       PlayLog[]

  @@index([organizationId])
}

model Device {
  id               String       @id @default(cuid())
  name             String
  roomId           String?
  room             Room?        @relation(fields: [roomId], references: [id], onDelete: SetNull)
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  pairingCode      String?      @unique
  pairingExpiresAt DateTime?
  lastSeenAt       DateTime?
  status           DeviceStatus @default(PENDING)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  playLogs         PlayLog[]

  @@index([organizationId])
  @@index([organizationId, roomId])
  @@index([pairingCode])
}

model Announcement {
  id             String           @id @default(cuid())
  title          String
  type           AnnouncementType
  text           String?          // For TTS
  audioUrl       String?          // For MP3
  language       String           @default("en-US")
  voice          String?
  organizationId String
  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  scheduleItems  ScheduleItem[]
  emergencyBroadcasts EmergencyBroadcast[]
  playLogs       PlayLog[]

  @@index([organizationId])
}

model Schedule {
  id             String       @id @default(cuid())
  name           String
  active         Boolean      @default(true)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  items          ScheduleItem[]

  @@index([organizationId])
  @@index([organizationId, active])
}

model ScheduleItem {
  id             String       @id @default(cuid())
  scheduleId     String
  schedule       Schedule     @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  roomId         String?      // null = all rooms
  room           Room?        @relation(fields: [roomId], references: [id], onDelete: SetNull)
  timeOfDay      String       // "HH:MM" format
  daysOfWeek     Int[]        // 0=Sunday, 1=Monday, etc.
  announcementId String
  announcement   Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  enabled        Boolean      @default(true)
  order          Int          @default(0)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([scheduleId])
  @@index([scheduleId, timeOfDay])
  @@index([roomId])
}

model EmergencyBroadcast {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  announcementId String
  announcement   Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  active         Boolean      @default(true)
  expiresAt      DateTime?
  createdAt      DateTime     @default(now())

  @@index([organizationId])
  @@index([organizationId, active])
}

model PlayLog {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  roomId         String?
  room           Room?        @relation(fields: [roomId], references: [id], onDelete: SetNull)
  deviceId       String?
  device         Device?      @relation(fields: [deviceId], references: [id], onDelete: SetNull)
  announcementId String?
  announcement   Announcement? @relation(fields: [announcementId], references: [id], onDelete: SetNull)
  scheduledAt    DateTime
  playedAt       DateTime?
  status         PlayStatus   @default(SCHEDULED)
  createdAt      DateTime     @default(now())

  @@index([organizationId])
  @@index([organizationId, scheduledAt])
  @@index([organizationId, deviceId])
  @@index([deviceId, scheduledAt])
}

model AuditLog {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String?
  action         String
  entityType     String
  entityId       String?
  oldValue       Json?
  newValue       Json?
  createdAt      DateTime     @default(now())

  @@index([organizationId])
  @@index([organizationId, createdAt])
}
```

### Key Indexes Summary
| Index | Purpose |
|-------|---------|
| `(organizationId)` | Tenant isolation queries |
| `(organizationId, roomId)` | Room-scoped queries |
| `(organizationId, deviceId)` | Device-scoped queries |
| `(scheduleId, timeOfDay)` | Schedule lookups |
| `(organizationId, scheduledAt)` | PlayLog queries |
| `(pairingCode)` | Device pairing lookup |
| `(clerkId)` | User auth lookup |

---

## 6. API Endpoints

### Authentication (Clerk handles)
- `/api/auth/*` - Clerk webhooks

### Health
- `GET /api/health` - DB connectivity check

### Organizations
- `GET /api/organizations/current` - Get current org
- `PATCH /api/organizations/current` - Update org settings

### Users
- `GET /api/users` - List org users
- `POST /api/users/invite` - Invite user
- `PATCH /api/users/[id]` - Update user role
- `DELETE /api/users/[id]` - Remove user

### Rooms
- `GET /api/rooms` - List rooms
- `POST /api/rooms` - Create room
- `PATCH /api/rooms/[id]` - Update room
- `DELETE /api/rooms/[id]` - Delete room

### Devices
- `GET /api/devices` - List devices
- `POST /api/devices` - Create device
- `PATCH /api/devices/[id]` - Update device
- `DELETE /api/devices/[id]` - Delete device
- `POST /api/devices/[id]/pairing-code` - Regenerate pairing code

### Pairing
- `POST /api/pair` - Exchange pairing code for deviceId

### Announcements
- `GET /api/announcements` - List announcements
- `POST /api/announcements` - Create announcement
- `PATCH /api/announcements/[id]` - Update announcement
- `DELETE /api/announcements/[id]` - Delete announcement

### Uploads
- `POST /api/uploads/audio` - Upload MP3 to R2

### Schedules
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule
- `PATCH /api/schedules/[id]` - Update schedule
- `DELETE /api/schedules/[id]` - Delete schedule

### Schedule Items
- `GET /api/schedules/[id]/items` - List items
- `POST /api/schedules/[id]/items` - Create item
- `PATCH /api/schedules/[id]/items/[itemId]` - Update item
- `DELETE /api/schedules/[id]/items/[itemId]` - Delete item
- `POST /api/schedules/[id]/items/reorder` - Reorder items

### Player (Device endpoints)
- `GET /api/player/schedule?deviceId=...` - Get today's schedule
- `GET /api/player/emergency?deviceId=...` - Check emergency broadcast
- `POST /api/player/heartbeat` - Device heartbeat
- `POST /api/player/log` - Log play status

### Emergency
- `GET /api/emergency` - Get active broadcast
- `POST /api/emergency` - Create broadcast
- `DELETE /api/emergency/[id]` - Cancel broadcast

### Billing
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Create portal session
- `POST /api/stripe/webhook` - Stripe webhooks

---

## 7. Security Model

### Roles & Permissions

| Permission | Owner | Admin | Staff |
|------------|-------|-------|-------|
| Manage billing | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Manage rooms | ✅ | ✅ | ❌ |
| Manage devices | ✅ | ✅ | ❌ |
| Manage announcements | ✅ | ✅ | ❌ |
| Manage schedules | ✅ | ✅ | ❌ |
| Emergency broadcast | ✅ | ✅ | ❌ |
| View dashboard | ✅ | ✅ | ✅ |
| Pair devices | ✅ | ✅ | ✅ |

### Data Isolation
```typescript
// lib/auth.ts - Every API route uses this pattern
export async function getOrgFromRequest(req: Request) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findFirst({
    where: { clerkId: userId },
    include: { organization: true }
  });

  if (!user) throw new Error("User not found");

  return { user, organization: user.organization };
}

// Example usage in API route
export async function GET(req: Request) {
  const { organization } = await getOrgFromRequest(req);

  const rooms = await prisma.room.findMany({
    where: { organizationId: organization.id } // Always scoped!
  });

  return Response.json(rooms);
}
```

### Additional Security Measures
- CSRF protection via SameSite cookies
- Rate limiting on player endpoints (100 req/min per device)
- Input validation with Zod schemas
- SQL injection prevention via Prisma
- XSS prevention via React
- Secure headers (CSP, HSTS)

---

## 8. Stripe Subscription Model

### Plan: Starter
- **Price**: $29.99/month
- **Limits**: 3 rooms, 3 devices
- **Features**: All MVP features

### Optional Setup Fee
- One-time $99 setup fee (configured in Stripe as separate product)
- Covers: onboarding call, initial configuration

### Subscription States
| Status | Dashboard Access | Create/Edit |
|--------|------------------|-------------|
| TRIAL | ✅ Full | ✅ Yes |
| ACTIVE | ✅ Full | ✅ Yes |
| PAST_DUE | ✅ Read-only | ❌ No |
| CANCELED | ✅ Read-only | ❌ No |

### Implementation
```typescript
// Stripe webhook handler
case 'customer.subscription.updated':
case 'customer.subscription.deleted':
  const subscription = event.data.object;
  await prisma.organization.update({
    where: { stripeCustomerId: subscription.customer },
    data: {
      subscriptionStatus: mapStripeStatus(subscription.status),
      stripeSubscriptionId: subscription.id
    }
  });
  break;
```

---

## 9. Render Deployment Plan

### render.yaml
```yaml
databases:
  - name: carevoice-db
    databaseName: carevoice
    user: carevoice
    plan: starter

services:
  - type: web
    name: carevoice-web
    runtime: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npx prisma migrate deploy && npm run start
    healthCheckPath: /api/health
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: carevoice-db
          property: connectionString
      - key: NEXT_PUBLIC_APP_URL
        sync: false
      - key: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        sync: false
      - key: CLERK_SECRET_KEY
        sync: false
      - key: CLERK_WEBHOOK_SECRET
        sync: false
      - key: STRIPE_SECRET_KEY
        sync: false
      - key: STRIPE_WEBHOOK_SECRET
        sync: false
      - key: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        sync: false
      - key: R2_ACCOUNT_ID
        sync: false
      - key: R2_ACCESS_KEY_ID
        sync: false
      - key: R2_SECRET_ACCESS_KEY
        sync: false
      - key: R2_BUCKET_NAME
        sync: false
      - key: NEXT_PUBLIC_R2_PUBLIC_URL
        sync: false
```

### Environment Variables
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | https://carevoice.onrender.com |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | R2 public URL |

---

## 10. Implementation Milestones

### Week 1: Foundation
- [x] Project setup (Next.js, TypeScript, Tailwind, shadcn)
- [x] Prisma schema + migrations
- [x] Clerk authentication
- [x] Basic dashboard layout

### Week 2: Core Features
- [ ] Room CRUD
- [ ] Announcement CRUD (TTS only)
- [ ] Device management + pairing
- [ ] Basic schedule builder

### Week 3: Player + Storage
- [ ] Fullscreen player
- [ ] MP3 upload to R2
- [ ] Offline caching
- [ ] Emergency broadcasts

### Week 4: Billing + Polish
- [ ] Stripe integration
- [ ] Usage limits enforcement
- [ ] Error handling
- [ ] Production hardening

### Week 5: Launch
- [ ] Render deployment
- [ ] Domain setup
- [ ] Monitoring (Sentry)
- [ ] Documentation

---

## 11. File Structure

```
carevoice/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── rooms/page.tsx
│   │   │   ├── devices/page.tsx
│   │   │   ├── announcements/page.tsx
│   │   │   ├── schedules/page.tsx
│   │   │   ├── schedules/[id]/page.tsx
│   │   │   └── emergency/page.tsx
│   │   └── layout.tsx
│   ├── (player)/
│   │   ├── player/[deviceId]/page.tsx
│   │   └── pair/page.tsx
│   ├── api/
│   │   ├── health/route.ts
│   │   ├── rooms/route.ts
│   │   ├── devices/route.ts
│   │   ├── announcements/route.ts
│   │   ├── schedules/route.ts
│   │   ├── uploads/audio/route.ts
│   │   ├── pair/route.ts
│   │   ├── player/
│   │   │   ├── schedule/route.ts
│   │   │   ├── emergency/route.ts
│   │   │   └── heartbeat/route.ts
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts
│   │   │   ├── portal/route.ts
│   │   │   └── webhook/route.ts
│   │   └── webhooks/clerk/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/ (shadcn components)
│   ├── dashboard/
│   ├── player/
│   └── forms/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── stripe.ts
│   ├── r2.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
├── .env.example
├── render.yaml
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## Ready to Build!

This plan covers the complete CareVoice MVP. The architecture is designed for:
- **Scale**: 2,000 orgs with proper indexing and query optimization
- **Security**: Strict tenant isolation at every layer
- **Reliability**: Offline-first player with graceful degradation
- **Monetization**: Stripe billing with usage limits
