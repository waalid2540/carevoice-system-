import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage, hasActiveSubscription } from "@/lib/auth";
import { updateRoomSchema } from "@/lib/validations";

// GET /api/rooms/[id] - Get a single room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization } = await getAuthContext();

    const room = await prisma.room.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        devices: true,
        _count: {
          select: {
            devices: true,
            scheduleItems: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("GET /api/rooms/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to fetch room" },
      { status: 500 }
    );
  }
}

// PATCH /api/rooms/[id] - Update a room
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, organization } = await getAuthContext();

    // Check role
    if (!canManage(user.role)) {
      return NextResponse.json(
        { message: "Only Owner or Admin can update rooms" },
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

    // Verify room belongs to org
    const existingRoom = await prisma.room.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingRoom) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // Validate input
    const body = await request.json();
    const result = updateRoomSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Update room
    const room = await prisma.room.update({
      where: { id },
      data: result.data,
      include: {
        _count: {
          select: {
            devices: true,
            scheduleItems: true,
          },
        },
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error("PATCH /api/rooms/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update room" },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[id] - Delete a room
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, organization } = await getAuthContext();

    // Check role
    if (!canManage(user.role)) {
      return NextResponse.json(
        { message: "Only Owner or Admin can delete rooms" },
        { status: 403 }
      );
    }

    // Verify room belongs to org
    const existingRoom = await prisma.room.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingRoom) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // Delete room (devices will have roomId set to null due to onDelete: SetNull)
    await prisma.room.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Room deleted" });
  } catch (error) {
    console.error("DELETE /api/rooms/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to delete room" },
      { status: 500 }
    );
  }
}
