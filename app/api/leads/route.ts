import { NextResponse } from "next/server";

// Simple lead storage - in production, save to database
const leads: Array<{
  name: string;
  email: string;
  phone: string;
  facilityName: string;
  rooms: string;
  createdAt: string;
}> = [];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, facilityName, rooms } = body;

    if (!name || !email || !facilityName) {
      return NextResponse.json(
        { error: "Name, email, and facility name are required" },
        { status: 400 }
      );
    }

    const lead = {
      name,
      email,
      phone: phone || "",
      facilityName,
      rooms: rooms || "1-3",
      createdAt: new Date().toISOString(),
    };

    leads.push(lead);

    // Log the lead (in production, save to DB and send email)
    console.log("New lead captured:", lead);

    // TODO: Send email notification via Resend
    // TODO: Save to database

    return NextResponse.json({ success: true, message: "Thank you! We'll be in touch within 24 hours." });
  } catch (error) {
    console.error("Lead capture error:", error);
    return NextResponse.json(
      { error: "Failed to submit" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Simple endpoint to view leads (protect in production)
  return NextResponse.json({ leads, count: leads.length });
}
