import { NextResponse } from "next/server";
import { getAuthContext, isOwner } from "@/lib/auth";
import { createPortalSession } from "@/lib/stripe";

// POST /api/stripe/portal - Create a customer portal session
export async function POST() {
  try {
    const { user, organization } = await getAuthContext();

    // Only owners can manage billing
    if (!isOwner(user.role)) {
      return NextResponse.json(
        { message: "Only owners can manage billing" },
        { status: 403 }
      );
    }

    if (!organization.stripeCustomerId) {
      return NextResponse.json(
        { message: "No billing account found. Please subscribe first." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${appUrl}/dashboard/settings`;

    const portalUrl = await createPortalSession(
      organization.stripeCustomerId,
      returnUrl
    );

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error("POST /api/stripe/portal error:", error);
    return NextResponse.json(
      { message: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
