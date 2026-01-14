import { z } from "zod";

// Room validations
export const createRoomSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const updateRoomSchema = createRoomSchema.partial();

// Device validations
export const createDeviceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  roomId: z.string().optional().nullable(),
});

export const updateDeviceSchema = createDeviceSchema.partial();

// Announcement validations
export const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  type: z.enum(["TTS", "MP3"]),
  text: z.string().optional().nullable(),
  audioUrl: z.string().url().optional().nullable(),
  language: z.string().default("en-US"),
  voice: z.string().optional().nullable(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

// Schedule validations
export const createScheduleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  active: z.boolean().default(true),
});

export const updateScheduleSchema = createScheduleSchema.partial();

// Schedule Item validations
export const createScheduleItemSchema = z.object({
  roomId: z.string().optional().nullable(),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1, "Select at least one day"),
  announcementId: z.string().min(1, "Announcement is required"),
  enabled: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const updateScheduleItemSchema = createScheduleItemSchema.partial();

export const reorderScheduleItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      order: z.number().int(),
    })
  ),
});

// Emergency Broadcast validations
export const createEmergencyBroadcastSchema = z.object({
  announcementId: z.string().min(1, "Announcement is required"),
  expiresAt: z.string().datetime().optional().nullable(),
});

// Pairing validations
export const pairDeviceSchema = z.object({
  pairingCode: z.string().length(6, "Pairing code must be 6 digits").regex(/^\d{6}$/, "Pairing code must be 6 digits"),
});

// Player validations
export const playerHeartbeatSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
});

export const playerLogSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  announcementId: z.string().min(1, "Announcement ID is required"),
  scheduledAt: z.string().datetime(),
  status: z.enum(["PLAYED", "SKIPPED", "FAILED"]),
});

// Type exports
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type CreateScheduleItemInput = z.infer<typeof createScheduleItemSchema>;
export type UpdateScheduleItemInput = z.infer<typeof updateScheduleItemSchema>;
export type ReorderScheduleItemsInput = z.infer<typeof reorderScheduleItemsSchema>;
export type CreateEmergencyBroadcastInput = z.infer<typeof createEmergencyBroadcastSchema>;
export type PairDeviceInput = z.infer<typeof pairDeviceSchema>;
export type PlayerHeartbeatInput = z.infer<typeof playerHeartbeatSchema>;
export type PlayerLogInput = z.infer<typeof playerLogSchema>;
