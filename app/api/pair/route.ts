import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pairDeviceSchema } from "@/lib/validations";

// POST /api/pair - Exchange pairing code for device ID
export async function POST(request: NextRequest) {
  try {
    // Validate input
    const body = await request.json();
    const result = pairDeviceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { pairingCode } = result.data;

    // Find device with this pairing code
    const device = await prisma.device.findFirst({
      where: {
        pairingCode,
        status: "PENDING",
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            timezone: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { message: "Invalid pairing code" },
        { status: 404 }
      );
    }

    // Check if code has expired
    if (device.pairingExpiresAt && new Date(device.pairingExpiresAt) < new Date()) {
      return NextResponse.json(
        { message: "Pairing code has expired" },
        { status: 400 }
      );
    }

    // Update device status to PAIRED
    await prisma.device.update({
      where: { id: device.id },
      data: {
        status: "PAIRED",
        pairingCode: null,
        pairingExpiresAt: null,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({
      deviceId: device.id,
      deviceName: device.name,
      room: device.room,
      organization: device.organization,
    });
  } catch (error) {
    console.error("POST /api/pair error:", error);
    return NextResponse.json(
      { message: "Failed to pair device" },
      { status: 500 }
    );
  }
}
