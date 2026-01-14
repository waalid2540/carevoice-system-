import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerLogSchema } from "@/lib/validations";

// POST /api/player/log - Log announcement playback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = playerLogSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { deviceId, announcementId, scheduledAt, status } = result.data;

    // Get device to get org and room info
    const device = await prisma.device.findFirst({
      where: { id: deviceId },
      select: {
        id: true,
        organizationId: true,
        roomId: true,
      },
    });

    if (!device) {
      return NextResponse.json(
        { message: "Device not found" },
        { status: 404 }
      );
    }

    // Check if we already have a log for this exact announcement at this time
    const existingLog = await prisma.playLog.findFirst({
      where: {
        deviceId,
        announcementId,
        scheduledAt: new Date(scheduledAt),
      },
    });

    if (existingLog) {
      // Update existing log
      await prisma.playLog.update({
        where: { id: existingLog.id },
        data: {
          status,
          playedAt: status === "PLAYED" ? new Date() : null,
        },
      });

      return NextResponse.json({ success: true, updated: true });
    }

    // Create new log
    await prisma.playLog.create({
      data: {
        organizationId: device.organizationId,
        roomId: device.roomId,
        deviceId,
        announcementId,
        scheduledAt: new Date(scheduledAt),
        playedAt: status === "PLAYED" ? new Date() : null,
        status,
      },
    });

    return NextResponse.json({ success: true, created: true });
  } catch (error) {
    console.error("POST /api/player/log error:", error);
    return NextResponse.json(
      { message: "Failed to log playback" },
      { status: 500 }
    );
  }
}
