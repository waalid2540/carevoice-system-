import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage, hasActiveSubscription } from "@/lib/auth";
import { createRoomSchema } from "@/lib/validations";
import { checkLimits } from "@/lib/stripe";

// GET /api/rooms - List all rooms
export async function GET() {
  try {
    const { organization } = await getAuthContext();

    const rooms = await prisma.room.findMany({
      where: { organizationId: organization.id },
      include: {
        _count: {
          select: {
            devices: true,
            scheduleItems: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("GET /api/rooms error:", error);
    return NextResponse.json(
      { message: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

// POST /api/rooms - Create a room
export async function POST(request: NextRequest) {
  try {
    const { user, organization } = await getAuthContext();

    // Check role
    if (!canManage(user.role)) {
      return NextResponse.json(
        { message: "Only Owner or Admin can create rooms" },
        { status: 403 }
      );
    }

    // Check subscription
    if (!hasActiveSubscription(organization.subscriptionStatus)) {
      return NextResponse.json(
        { message: "Active subscription required" },
        { status: 403 }
      );
    }

    // Check limits
    const roomCount = await prisma.room.count({
      where: { organizationId: organization.id },
    });
    const deviceCount = await prisma.device.count({
      where: { organizationId: organization.id },
    });
    const { canAddRoom } = checkLimits(roomCount, deviceCount);

    if (!canAddRoom) {
      return NextResponse.json(
        { message: "Room limit reached for your plan (max 3 rooms)" },
        { status: 403 }
      );
    }

    // Validate input
    const body = await request.json();
    const result = createRoomSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // Create room
    const room = await prisma.room.create({
      data: {
        name: result.data.name,
        organizationId: organization.id,
      },
      include: {
        _count: {
          select: {
            devices: true,
            scheduleItems: true,
          },
        },
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json(
      { message: "Failed to create room" },
      { status: 500 }
    );
  }
}
