import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage, hasActiveSubscription } from "@/lib/auth";
import { updateAnnouncementSchema } from "@/lib/validations";

// GET /api/announcements/[id] - Get a single announcement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization } = await getAuthContext();

    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { message: "Announcement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(announcement);
  } catch (error) {
    console.error("GET /api/announcements/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to fetch announcement" },
      { status: 500 }
    );
  }
}

// PATCH /api/announcements/[id] - Update an announcement
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
        { message: "Only Owner or Admin can update announcements" },
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

    // Verify announcement belongs to org
    const existing = await prisma.announcement.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Announcement not found" },
        { status: 404 }
      );
    }

    // Validate input
    const body = await request.json();
    const result = updateAnnouncementSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // Update announcement
    const announcement = await prisma.announcement.update({
      where: { id },
      data: result.data,
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error("PATCH /api/announcements/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update announcement" },
      { status: 500 }
    );
  }
}

// DELETE /api/announcements/[id] - Delete an announcement
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
        { message: "Only Owner or Admin can delete announcements" },
        { status: 403 }
      );
    }

    // Verify announcement belongs to org
    const existing = await prisma.announcement.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Announcement not found" },
        { status: 404 }
      );
    }

    // Delete announcement (will cascade to schedule items and emergency broadcasts)
    await prisma.announcement.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Announcement deleted" });
  } catch (error) {
    console.error("DELETE /api/announcements/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to delete announcement" },
      { status: 500 }
    );
  }
}
