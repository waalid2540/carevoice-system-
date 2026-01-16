"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Settings,
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  timezone: string;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    const billing = searchParams.get("billing");
    if (billing === "success") {
      toast.success("Subscription activated successfully!");
    } else if (billing === "canceled") {
      toast.info("Billing setup was canceled");
    }

    fetchOrg();
  }, [searchParams]);

  async function fetchOrg() {
    try {
      setOrg({
        id: "org-1",
        name: "My Organization",
        timezone: "America/New_York",
        subscriptionStatus: "TRIAL",
        stripeCustomerId: null,
      });
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe() {
    setBillingLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to start checkout");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout"
      );
      setBillingLoading(false);
    }
  }

  async function handleManageBilling() {
    setBillingLoading(true);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to open billing portal");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to open portal"
      );
      setBillingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const isActive =
    org?.subscriptionStatus === "ACTIVE" || org?.subscriptionStatus === "TRIAL";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your organization and billing
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>Manage your billing and plan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">Starter Plan</span>
                  <Badge
                    variant={isActive ? "default" : "destructive"}
                    className="flex items-center gap-1"
                  >
                    {isActive ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {org?.subscriptionStatus}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">
                  $29.99<span className="text-sm font-normal">/month</span>
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Up to 3 rooms</li>
                  <li>Up to 3 devices</li>
                  <li>Unlimited announcements</li>
                  <li>Unlimited schedules</li>
                  <li>Emergency broadcasts</li>
                </ul>
              </div>
              <div>
                {org?.stripeCustomerId ? (
                  <Button
                    variant="outline"
                    onClick={handleManageBilling}
                    disabled={billingLoading}
                  >
                    {billingLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Manage Billing
                  </Button>
                ) : (
                  <Button onClick={handleSubscribe} disabled={billingLoading}>
                    {billingLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Subscribe Now
                  </Button>
                )}
              </div>
            </div>

            {org?.subscriptionStatus === "TRIAL" && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Free Trial:</strong> You have 14 days to try
                  CareVoice System. Subscribe to continue after your trial ends.
                </p>
              </div>
            )}

            {org?.subscriptionStatus === "PAST_DUE" && (
              <div className="mt-6 p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Payment Failed:</strong> Please update your payment
                  method to continue using CareVoice System.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Settings className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <CardTitle>Organization</CardTitle>
                <CardDescription>Your organization settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Organization Name</span>
                <p className="font-medium">{org?.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Timezone</span>
                <p className="font-medium">{org?.timezone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
