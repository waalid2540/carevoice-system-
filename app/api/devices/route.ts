import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage, hasActiveSubscription } from "@/lib/auth";
import { createDeviceSchema } from "@/lib/validations";
import { checkLimits } from "@/lib/stripe";

// Generate a random 6-digit pairing code
function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET /api/devices - List all devices
export async function GET() {
  try {
    const { organization } = await getAuthContext();

    const devices = await prisma.device.findMany({
      where: { organizationId: organization.id },
      include: {
        room: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(devices);
  } catch (error) {
    console.error("GET /api/devices error:", error);
    return NextResponse.json(
      { message: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

// POST /api/devices - Create a device
export async function POST(request: NextRequest) {
  try {
    const { user, organization } = await getAuthContext();

    // Check role
    if (!canManage(user.role)) {
      return NextResponse.json(
        { message: "Only Owner or Admin can create devices" },
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
    const { canAddDevice } = checkLimits(roomCount, deviceCount);

    if (!canAddDevice) {
      return NextResponse.json(
        { message: "Device limit reached for your plan (max 3 devices)" },
        { status: 403 }
      );
    }

    // Validate input
    const body = await request.json();
    const result = createDeviceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.errors[0].message },
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

    // Generate pairing code
    const pairingCode = generatePairingCode();
    const pairingExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create device
    const device = await prisma.device.create({
      data: {
        name: result.data.name,
        roomId: result.data.roomId || null,
        organizationId: organization.id,
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

    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    console.error("POST /api/devices error:", error);
    return NextResponse.json(
      { message: "Failed to create device" },
      { status: 500 }
    );
  }
}
