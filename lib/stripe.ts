import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

export const PLANS = {
  STARTER: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    price: 29.99,
    limits: {
      maxRooms: 3,
      maxDevices: 3,
    },
  },
} as const;

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string | null,
  organizationId: string,
  customerEmail: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId || undefined,
    customer_email: customerId ? undefined : customerEmail,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: PLANS.STARTER.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId,
    },
    subscription_data: {
      metadata: {
        organizationId,
      },
    },
  });

  return session.url!;
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Map Stripe subscription status to our SubscriptionStatus enum
 */
export function mapStripeStatus(
  status: Stripe.Subscription.Status
): "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIAL" {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIAL";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "CANCELED";
    default:
      return "CANCELED";
  }
}

/**
 * Check if organization is within plan limits
 */
export function checkLimits(
  currentRooms: number,
  currentDevices: number,
  plan: keyof typeof PLANS = "STARTER"
): { canAddRoom: boolean; canAddDevice: boolean } {
  const limits = PLANS[plan].limits;
  return {
    canAddRoom: currentRooms < limits.maxRooms,
    canAddDevice: currentDevices < limits.maxDevices,
  };
}
