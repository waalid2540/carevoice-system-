import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage, hasActiveSubscription } from "@/lib/auth";
import { createEmergencyBroadcastSchema } from "@/lib/validations";

// GET /api/emergency - Get active emergency broadcast
export async function GET() {
  try {
    const { organization } = await getAuthContext();

    const now = new Date();
    const broadcast = await prisma.emergencyBroadcast.findFirst({
      where: {
        organizationId: organization.id,
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        announcement: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error("GET /api/emergency error:", error);
    return NextResponse.json(
      { message: "Failed to fetch emergency broadcast" },
      { status: 500 }
    );
  }
}

// POST /api/emergency - Create emergency broadcast
export async function POST(request: NextRequest) {
  try {
    const { user, organization } = await getAuthContext();

    // Check role
    if (!canManage(user.role)) {
      return NextResponse.json(
        { message: "Only Owner or Admin can create emergency broadcasts" },
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

    // Validate input
    const body = await request.json();
    const result = createEmergencyBroadcastSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { announcementId, expiresAt } = result.data;

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

    // Deactivate any existing broadcasts
    await prisma.emergencyBroadcast.updateMany({
      where: {
        organizationId: organization.id,
        active: true,
      },
      data: { active: false },
    });

    // Create new broadcast
    const broadcast = await prisma.emergencyBroadcast.create({
      data: {
        organizationId: organization.id,
        announcementId,
        active: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        announcement: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        action: "emergency.create",
        entityType: "EmergencyBroadcast",
        entityId: broadcast.id,
        newValue: broadcast as object,
      },
    });

    return NextResponse.json(broadcast, { status: 201 });
  } catch (error) {
    console.error("POST /api/emergency error:", error);
    return NextResponse.json(
      { message: "Failed to create emergency broadcast" },
      { status: 500 }
    );
  }
}
