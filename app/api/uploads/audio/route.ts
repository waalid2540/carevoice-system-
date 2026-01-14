import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, canManage, hasActiveSubscription } from "@/lib/auth";
import { uploadToR2, isValidAudioType, MAX_AUDIO_SIZE } from "@/lib/r2";

// POST /api/uploads/audio - Upload an audio file to R2
export async function POST(request: NextRequest) {
  try {
    const { user, organization } = await getAuthContext();

    // Check role
    if (!canManage(user.role)) {
      return NextResponse.json(
        { message: "Only Owner or Admin can upload files" },
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

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidAudioType(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Supported: MP3, WAV, OGG" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { message: "File too large. Max size: 10MB" },
        { status: 400 }
      );
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate safe filename
    const safeName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .substring(0, 100);

    // Upload to R2
    const result = await uploadToR2(
      buffer,
      safeName,
      file.type,
      `audio/${organization.id}`
    );

    return NextResponse.json({
      url: result.url,
      key: result.key,
    });
  } catch (error) {
    console.error("POST /api/uploads/audio error:", error);
    return NextResponse.json(
      { message: "Failed to upload file" },
      { status: 500 }
    );
  }
}
