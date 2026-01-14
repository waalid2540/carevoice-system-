import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage } from "@/lib/auth";

// DELETE /api/emergency/[id] - Cancel emergency broadcast
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
        { message: "Only Owner or Admin can cancel emergency broadcasts" },
        { status: 403 }
      );
    }

    // Verify broadcast belongs to org
    const broadcast = await prisma.emergencyBroadcast.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!broadcast) {
      return NextResponse.json(
        { message: "Broadcast not found" },
        { status: 404 }
      );
    }

    // Deactivate broadcast
    await prisma.emergencyBroadcast.update({
      where: { id },
      data: { active: false },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        action: "emergency.cancel",
        entityType: "EmergencyBroadcast",
        entityId: id,
        oldValue: broadcast as object,
      },
    });

    return NextResponse.json({ message: "Broadcast canceled" });
  } catch (error) {
    console.error("DELETE /api/emergency/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to cancel broadcast" },
      { status: 500 }
    );
  }
}
