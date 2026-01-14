import { NextResponse } from "next/server";
import { getAuthContext, isOwner } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// POST /api/stripe/checkout - Create a checkout session
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

    // Get or create Stripe customer ID
    let customerId = organization.stripeCustomerId || null;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${appUrl}/dashboard/settings?billing=success`;
    const cancelUrl = `${appUrl}/dashboard/settings?billing=canceled`;

    const checkoutUrl = await createCheckoutSession(
      customerId,
      organization.id,
      user.email,
      successUrl,
      cancelUrl
    );

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("POST /api/stripe/checkout error:", error);
    return NextResponse.json(
      { message: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
