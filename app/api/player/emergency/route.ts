import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/player/emergency?deviceId=... - Check for emergency broadcast
export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json(
        { message: "Device ID is required" },
        { status: 400 }
      );
    }

    // Get device
    const device = await prisma.device.findFirst({
      where: { id: deviceId },
      select: { organizationId: true },
    });

    if (!device) {
      return NextResponse.json(
        { message: "Device not found" },
        { status: 404 }
      );
    }

    // Get active emergency broadcast
    const now = new Date();
    const broadcast = await prisma.emergencyBroadcast.findFirst({
      where: {
        organizationId: device.organizationId,
        active: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            type: true,
            text: true,
            audioUrl: true,
            language: true,
            voice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // If no active broadcast, return empty
    if (!broadcast) {
      return NextResponse.json(
        { active: false },
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );
    }

    return NextResponse.json(
      {
        active: true,
        id: broadcast.id,
        announcement: broadcast.announcement,
        expiresAt: broadcast.expiresAt,
        createdAt: broadcast.createdAt,
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/player/emergency error:", error);
    return NextResponse.json(
      { message: "Failed to check emergency broadcast" },
      { status: 500 }
    );
  }
}
