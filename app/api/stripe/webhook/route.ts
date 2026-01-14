import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe, mapStripeStatus } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// POST /api/stripe/webhook - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { message: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { message: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organizationId;

        if (organizationId && session.customer) {
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              stripeCustomerId: session.customer as string,
              subscriptionStatus: "ACTIVE",
            },
          });
          console.log(`Checkout completed for org: ${organizationId}`);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: mapStripeStatus(subscription.status),
          },
        });
        console.log(`Subscription ${event.type}: ${subscription.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: "CANCELED",
          },
        });
        console.log(`Subscription canceled: ${subscription.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: "PAST_DUE",
          },
        });
        console.log(`Payment failed for customer: ${customerId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Only update if currently past due
        await prisma.organization.updateMany({
          where: {
            stripeCustomerId: customerId,
            subscriptionStatus: "PAST_DUE",
          },
          data: {
            subscriptionStatus: "ACTIVE",
          },
        });
        console.log(`Payment succeeded for customer: ${customerId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { message: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
