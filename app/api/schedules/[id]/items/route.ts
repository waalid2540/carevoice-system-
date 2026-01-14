import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage, hasActiveSubscription } from "@/lib/auth";
import { createScheduleItemSchema, reorderScheduleItemsSchema } from "@/lib/validations";

// GET /api/schedules/[id]/items - List schedule items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization } = await getAuthContext();

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

    const items = await prisma.scheduleItem.findMany({
      where: { scheduleId: id },
      include: {
        announcement: true,
        room: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ timeOfDay: "asc" }, { order: "asc" }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/schedules/[id]/items error:", error);
    return NextResponse.json(
      { message: "Failed to fetch schedule items" },
      { status: 500 }
    );
  }
}

// POST /api/schedules/[id]/items - Create a schedule item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, organization } = await getAuthContext();

    // Check role
    if (!canManage(user.role)) {
      return NextResponse.json(
        { message: "Only Owner or Admin can add schedule items" },
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

    // Validate input
    const body = await request.json();
    const result = createScheduleItemSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { roomId, timeOfDay, daysOfWeek, announcementId, enabled, order } =
      result.data;

    // Verify announcement belongs to org
    const announcement = await prisma.announcement.findFirst({
      where: {
        id: announcementId,
        organizationId: organization.id,
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { message: "Announcement not found" },
        { status: 404 }
      );
    }

    // Verify room if provided
    if (roomId) {
      const room = await prisma.room.findFirst({
        where: {
          id: roomId,
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

    // Get next order if not provided
    let itemOrder = order;
    if (itemOrder === undefined) {
      const lastItem = await prisma.scheduleItem.findFirst({
        where: { scheduleId: id },
        orderBy: { order: "desc" },
      });
      itemOrder = (lastItem?.order ?? 0) + 1;
    }

    // Create schedule item
    const item = await prisma.scheduleItem.create({
      data: {
        scheduleId: id,
        roomId: roomId || null,
        timeOfDay,
        daysOfWeek,
        announcementId,
        enabled: enabled ?? true,
        order: itemOrder,
      },
      include: {
        announcement: true,
        room: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("POST /api/schedules/[id]/items error:", error);
    return NextResponse.json(
      { message: "Failed to create schedule item" },
      { status: 500 }
    );
  }
}

// PUT /api/schedules/[id]/items - Reorder schedule items
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, organization } = await getAuthContext();

    // Check role
    if (!canManage(user.role)) {
      return NextResponse.json(
        { message: "Only Owner or Admin can reorder items" },
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

    // Validate input
    const body = await request.json();
    const result = reorderScheduleItemsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // Update order for each item
    await Promise.all(
      result.data.items.map((item) =>
        prisma.scheduleItem.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    return NextResponse.json({ message: "Items reordered" });
  } catch (error) {
    console.error("PUT /api/schedules/[id]/items error:", error);
    return NextResponse.json(
      { message: "Failed to reorder items" },
      { status: 500 }
    );
  }
}
