import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerHeartbeatSchema } from "@/lib/validations";

// POST /api/player/heartbeat - Update device last seen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = playerHeartbeatSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { deviceId } = result.data;

    // Update device lastSeenAt
    const device = await prisma.device.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() },
      select: { id: true, lastSeenAt: true },
    });

    return NextResponse.json({
      success: true,
      lastSeenAt: device.lastSeenAt,
    });
  } catch (error) {
    // Device not found is not an error worth logging loudly
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        { message: "Device not found" },
        { status: 404 }
      );
    }

    console.error("POST /api/player/heartbeat error:", error);
    return NextResponse.json(
      { message: "Failed to update heartbeat" },
      { status: 500 }
    );
  }
}
