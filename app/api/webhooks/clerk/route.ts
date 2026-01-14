import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Get the headers
  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { message: "Missing svix headers" },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return NextResponse.json(
      { message: "Error verifying webhook" },
      { status: 400 }
    );
  }

  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      return NextResponse.json(
        { message: "No email found" },
        { status: 400 }
      );
    }

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: { clerkId: id },
      });

      if (!existingUser) {
        // Create a new organization for the user
        const org = await prisma.organization.create({
          data: {
            name: `${first_name || email.split("@")[0]}'s Organization`,
            timezone: "America/New_York",
            subscriptionStatus: "TRIAL",
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });

        // Create the user
        await prisma.user.create({
          data: {
            clerkId: id,
            email,
            name:
              first_name && last_name
                ? `${first_name} ${last_name}`
                : first_name || null,
            role: "OWNER",
            organizationId: org.id,
          },
        });

        console.log(`Created user and org for ${email}`);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      return NextResponse.json(
        { message: "Error creating user" },
        { status: 500 }
      );
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    try {
      // Find user
      const user = await prisma.user.findFirst({
        where: { clerkId: id },
        include: { organization: true },
      });

      if (user) {
        // If owner and only user, delete org
        const userCount = await prisma.user.count({
          where: { organizationId: user.organizationId },
        });

        if (user.role === "OWNER" && userCount === 1) {
          await prisma.organization.delete({
            where: { id: user.organizationId },
          });
        } else {
          await prisma.user.delete({
            where: { id: user.id },
          });
        }

        console.log(`Deleted user ${id}`);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  }

  return NextResponse.json({ received: true });
}
