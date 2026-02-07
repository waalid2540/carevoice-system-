import { prisma } from "./prisma";
import { CvUserRole as UserRole } from "@prisma/client";

// DEMO MODE: Set to true to bypass Clerk authentication
const DEMO_MODE = true;

export type AuthUser = {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  role: UserRole;
  organizationId: string;
};

export type AuthContext = {
  user: AuthUser;
  organization: {
    id: string;
    name: string;
    timezone: string;
    subscriptionStatus: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  };
};

/**
 * Get the authenticated user and their organization from the request.
 * In DEMO_MODE, returns the first user/org from database.
 */
export async function getAuthContext(): Promise<AuthContext> {
  if (DEMO_MODE) {
    // Get demo org and user from database
    const org = await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!org) {
      throw new Error("No organization found. Run: npm run db:seed");
    }

    let user = await prisma.user.findFirst({
      where: { organizationId: org.id },
    });

    // Create demo user if none exists
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: "demo-user",
          email: "demo@carevoice.app",
          name: "Demo User",
          role: "OWNER",
          organizationId: org.id,
        },
      });
    }

    return {
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      organization: {
        id: org.id,
        name: org.name,
        timezone: org.timezone,
        subscriptionStatus: org.subscriptionStatus,
        stripeCustomerId: org.stripeCustomerId,
        stripeSubscriptionId: org.stripeSubscriptionId,
      },
    };
  }

  // Production mode - use Clerk
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findFirst({
    where: { clerkId: userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          timezone: true,
          subscriptionStatus: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found in database");
  }

  return {
    user: {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    },
    organization: user.organization,
  };
}

/**
 * Check if the user has one of the required roles.
 */
export function requireRole(
  userRole: UserRole,
  allowedRoles: UserRole[]
): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Check if the user can manage resources (Owner or Admin).
 */
export function canManage(role: UserRole): boolean {
  return requireRole(role, ["OWNER", "ADMIN"]);
}

/**
 * Check if the user is the owner.
 */
export function isOwner(role: UserRole): boolean {
  return role === "OWNER";
}

/**
 * Check if the organization has an active subscription.
 */
export function hasActiveSubscription(status: string): boolean {
  return status === "ACTIVE" || status === "TRIAL";
}

/**
 * Get or create a user from Clerk data.
 * Used during sign-up or first login.
 */
export async function getOrCreateUser(organizationId?: string) {
  if (DEMO_MODE) {
    // In demo mode, just return the demo user
    const context = await getAuthContext();
    return {
      ...context.user,
      organization: context.organization,
    };
  }

  const { currentUser } = await import("@clerk/nextjs/server");
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Not authenticated");
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("No email found");
  }

  // Check if user exists
  let user = await prisma.user.findFirst({
    where: { clerkId: clerkUser.id },
    include: { organization: true },
  });

  if (user) {
    return user;
  }

  // If no org provided, create a new one
  if (!organizationId) {
    const org = await prisma.organization.create({
      data: {
        name: `${clerkUser.firstName || email.split("@")[0]}'s Organization`,
        timezone: "America/New_York",
        subscriptionStatus: "TRIAL",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    organizationId = org.id;
  }

  // Create the user
  user = await prisma.user.create({
    data: {
      clerkId: clerkUser.id,
      email,
      name: clerkUser.fullName || clerkUser.firstName || null,
      role: "OWNER",
      organizationId,
    },
    include: { organization: true },
  });

  return user;
}
