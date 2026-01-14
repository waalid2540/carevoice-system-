import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/player/schedule?deviceId=... - Get today's schedule for device
export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json(
        { message: "Device ID is required" },
        { status: 400 }
      );
    }

    // Get device with org info
    const device = await prisma.device.findFirst({
      where: { id: deviceId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            timezone: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { message: "Device not found" },
        { status: 404 }
      );
    }

    // Get current day of week (0-6, Sunday-Saturday)
    const now = new Date();
    const dayOfWeek = now.getDay();

    // Get active schedules with items for this room or all rooms
    const schedules = await prisma.schedule.findMany({
      where: {
        organizationId: device.organizationId,
        active: true,
      },
      include: {
        items: {
          where: {
            enabled: true,
            OR: [
              { roomId: null }, // All rooms
              { roomId: device.roomId }, // This room
            ],
            daysOfWeek: { has: dayOfWeek },
          },
          include: {
            announcement: true,
            room: {
              select: { id: true, name: true },
            },
          },
          orderBy: [{ timeOfDay: "asc" }, { order: "asc" }],
        },
      },
    });

    // Flatten all items from all schedules
    const items = schedules.flatMap((schedule) =>
      schedule.items.map((item) => ({
        id: item.id,
        scheduleId: item.scheduleId,
        scheduleName: schedule.name,
        timeOfDay: item.timeOfDay,
        daysOfWeek: item.daysOfWeek,
        room: item.room,
        announcement: {
          id: item.announcement.id,
          title: item.announcement.title,
          type: item.announcement.type,
          text: item.announcement.text,
          audioUrl: item.announcement.audioUrl,
          language: item.announcement.language,
          voice: item.announcement.voice,
        },
      }))
    );

    // Sort by time
    items.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));

    const response = {
      device: {
        id: device.id,
        name: device.name,
      },
      room: device.room,
      organization: device.organization,
      timezone: device.organization.timezone,
      date: now.toISOString().split("T")[0],
      dayOfWeek,
      items,
    };

    // Add cache headers (30 second max-age for schedule)
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("GET /api/player/schedule error:", error);
    return NextResponse.json(
      { message: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
