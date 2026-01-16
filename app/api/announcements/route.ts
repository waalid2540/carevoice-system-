import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, canManage, hasActiveSubscription } from "@/lib/auth";
import { createAnnouncementSchema } from "@/lib/validations";

// GET /api/announcements - List all announcements
export async function GET() {
  try {
    const { organization } = await getAuthContext();

    const announcements = await prisma.announcement.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error("GET /api/announcements error:", error);
    return NextResponse.json(
      { message: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

// POST /api/announcements - Create an announcement
export async function POST(request: NextRequest) {
  try {
    const { user, organization } = await getAuthContext();

    // Check role
    if (!canManage(user.role)) {
      return NextResponse.json(
        { message: "Only Owner or Admin can create announcements" },
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
    const result = createAnnouncementSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, type, text, audioUrl, language, voice } = result.data;

    // Validate based on type
    if (type === "TTS" && !text) {
      return NextResponse.json(
        { message: "Text is required for TTS announcements" },
        { status: 400 }
      );
    }

    if (type === "MP3" && !audioUrl) {
      return NextResponse.json(
        { message: "Audio URL is required for MP3 announcements" },
        { status: 400 }
      );
    }

    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        title,
        type,
        text: type === "TTS" ? text : null,
        audioUrl: type === "MP3" ? audioUrl : null,
        language: language || "en-US",
        voice,
        organizationId: organization.id,
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json(
      { message: "Failed to create announcement" },
      { status: 500 }
    );
  }
}
