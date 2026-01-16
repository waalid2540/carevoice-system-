import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage, hasActiveSubscription } from "@/lib/auth";
import { updateDeviceSchema } from "@/lib/validations";

// GET /api/devices/[id] - Get a single device
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization } = await getAuthContext();

    const device = await prisma.device.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        room: true,
      },
    });

    if (!device) {
      return NextResponse.json(
        { message: "Device not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(device);
  } catch (error) {
    console.error("GET /api/devices/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to fetch device" },
      { status: 500 }
    );
  }
}

// PATCH /api/devices/[id] - Update a device
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
        { message: "Only Owner or Admin can update devices" },
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

    // Verify device belongs to org
    const existingDevice = await prisma.device.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingDevice) {
      return NextResponse.json(
        { message: "Device not found" },
        { status: 404 }
      );
    }

    // Validate input
    const body = await request.json();
    const result = updateDeviceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // If roomId provided, verify it belongs to org
    if (result.data.roomId) {
      const room = await prisma.room.findFirst({
        where: {
          id: result.data.roomId,
          organizationId: organization.id,
        },
      });

      if (!room) {
        return NextResponse.json(
          { message: "Room not found" },
          { status: 404 }
        );
      }
    }

    // Update device
    const device = await prisma.device.update({
      where: { id },
      data: {
        name: result.data.name,
        roomId: result.data.roomId ?? existingDevice.roomId,
      },
      include: {
        room: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error("PATCH /api/devices/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update device" },
      { status: 500 }
    );
  }
}

// DELETE /api/devices/[id] - Delete a device
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
        { message: "Only Owner or Admin can delete devices" },
        { status: 403 }
      );
    }

    // Verify device belongs to org
    const existingDevice = await prisma.device.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingDevice) {
      return NextResponse.json(
        { message: "Device not found" },
        { status: 404 }
      );
    }

    // Delete device
    await prisma.device.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Device deleted" });
  } catch (error) {
    console.error("DELETE /api/devices/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to delete device" },
      { status: 500 }
    );
  }
}
