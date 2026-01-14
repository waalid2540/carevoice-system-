import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage } from "@/lib/auth";

// Generate a random 6-digit pairing code
function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/devices/[id]/pairing-code - Regenerate pairing code
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
        { message: "Only Owner or Admin can regenerate pairing codes" },
        { status: 403 }
      );
    }

    // Verify device belongs to org and is in PENDING status
    const device = await prisma.device.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!device) {
      return NextResponse.json(
        { message: "Device not found" },
        { status: 404 }
      );
    }

    if (device.status === "PAIRED") {
      return NextResponse.json(
        { message: "Cannot regenerate code for a paired device" },
        { status: 400 }
      );
    }

    // Generate new pairing code
    const pairingCode = generatePairingCode();
    const pairingExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update device
    const updatedDevice = await prisma.device.update({
      where: { id },
      data: {
        pairingCode,
        pairingExpiresAt,
        status: "PENDING",
      },
      include: {
        room: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updatedDevice);
  } catch (error) {
    console.error("POST /api/devices/[id]/pairing-code error:", error);
    return NextResponse.json(
      { message: "Failed to regenerate pairing code" },
      { status: 500 }
    );
  }
}
