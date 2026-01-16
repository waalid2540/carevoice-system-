import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage, hasActiveSubscription } from "@/lib/auth";
import { updateScheduleItemSchema } from "@/lib/validations";

// PATCH /api/schedules/[id]/items/[itemId] - Update a schedule item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const { user, organization } = await getAuthContext();

    // Check role
    if (!canManage(user.role)) {
      return NextResponse.json(
        { message: "Only Owner or Admin can update schedule items" },
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

    // Verify schedule belongs to org
    const schedule = await prisma.schedule.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      );
    }

    // Verify item exists
    const existingItem = await prisma.scheduleItem.findFirst({
      where: {
        id: itemId,
        scheduleId: id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    // Validate input
    const body = await request.json();
    const result = updateScheduleItemSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (result.data.timeOfDay !== undefined) {
      updateData.timeOfDay = result.data.timeOfDay;
    }
    if (result.data.daysOfWeek !== undefined) {
      updateData.daysOfWeek = result.data.daysOfWeek;
    }
    if (result.data.enabled !== undefined) {
      updateData.enabled = result.data.enabled;
    }
    if (result.data.order !== undefined) {
      updateData.order = result.data.order;
    }
    if (result.data.roomId !== undefined) {
      if (result.data.roomId) {
        // Verify room belongs to org
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
      updateData.roomId = result.data.roomId || null;
    }
    if (result.data.announcementId !== undefined) {
      // Verify announcement belongs to org
      const announcement = await prisma.announcement.findFirst({
        where: {
          id: result.data.announcementId,
          organizationId: organization.id,
        },
      });
      if (!announcement) {
        return NextResponse.json(
          { message: "Announcement not found" },
          { status: 404 }
        );
      }
      updateData.announcementId = result.data.announcementId;
    }

    // Update item
    const item = await prisma.scheduleItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        announcement: true,
        room: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("PATCH /api/schedules/[id]/items/[itemId] error:", error);
    return NextResponse.json(
      { message: "Failed to update schedule item" },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules/[id]/items/[itemId] - Delete a schedule item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const { user, organization } = await getAuthContext();

    // Check role
    if (!canManage(user.role)) {
      return NextResponse.json(
        { message: "Only Owner or Admin can delete schedule items" },
        { status: 403 }
      );
    }

    // Verify schedule belongs to org
    const schedule = await prisma.schedule.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      );
    }

    // Verify item exists
    const existingItem = await prisma.scheduleItem.findFirst({
      where: {
        id: itemId,
        scheduleId: id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    // Delete item
    await prisma.scheduleItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ message: "Item deleted" });
  } catch (error) {
    console.error("DELETE /api/schedules/[id]/items/[itemId] error:", error);
    return NextResponse.json(
      { message: "Failed to delete schedule item" },
      { status: 500 }
    );
  }
}
