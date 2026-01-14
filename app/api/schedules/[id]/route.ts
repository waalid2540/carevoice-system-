import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage, hasActiveSubscription } from "@/lib/auth";
import { updateScheduleSchema } from "@/lib/validations";

// GET /api/schedules/[id] - Get a single schedule with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization } = await getAuthContext();

    const schedule = await prisma.schedule.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        items: {
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

    if (!schedule) {
      return NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("GET /api/schedules/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}

// PATCH /api/schedules/[id] - Update a schedule
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
        { message: "Only Owner or Admin can update schedules" },
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
    const existing = await prisma.schedule.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      );
    }

    // Validate input
    const body = await request.json();
    const result = updateScheduleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // Update schedule
    const schedule = await prisma.schedule.update({
      where: { id },
      data: result.data,
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        action: "schedule.update",
        entityType: "Schedule",
        entityId: id,
        oldValue: existing as object,
        newValue: schedule as object,
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("PATCH /api/schedules/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update schedule" },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules/[id] - Delete a schedule
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
        { message: "Only Owner or Admin can delete schedules" },
        { status: 403 }
      );
    }

    // Verify schedule belongs to org
    const existing = await prisma.schedule.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      );
    }

    // Delete schedule (items will cascade)
    await prisma.schedule.delete({
      where: { id },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        action: "schedule.delete",
        entityType: "Schedule",
        entityId: id,
        oldValue: existing as object,
      },
    });

    return NextResponse.json({ message: "Schedule deleted" });
  } catch (error) {
    console.error("DELETE /api/schedules/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to delete schedule" },
      { status: 500 }
    );
  }
}
