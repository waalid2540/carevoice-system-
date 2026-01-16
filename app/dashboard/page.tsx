export const dynamic = "force-dynamic";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, Monitor, Volume2, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";

async function getDashboardStats(organizationId: string) {
  const [roomCount, deviceCount, announcementCount, scheduleCount, devices] =
    await Promise.all([
      prisma.room.count({ where: { organizationId } }),
      prisma.device.count({ where: { organizationId } }),
      prisma.announcement.count({ where: { organizationId } }),
      prisma.schedule.count({ where: { organizationId, active: true } }),
      prisma.device.findMany({
        where: { organizationId },
        include: { room: true },
        orderBy: { lastSeenAt: "desc" },
        take: 5,
      }),
    ]);

  return { roomCount, deviceCount, announcementCount, scheduleCount, devices };
}

function isDeviceOnline(lastSeenAt: Date | null): boolean {
  if (!lastSeenAt) return false;
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return lastSeenAt > twoMinutesAgo;
}

export default async function DashboardPage() {
  let authContext;
  try {
    authContext = await getAuthContext();
  } catch {
    // User not in database yet, create them
    await getOrCreateUser();
    redirect("/dashboard");
  }

  const { organization } = authContext;
  const stats = await getDashboardStats(organization.id);

  const statCards = [
    {
      title: "Rooms",
      value: stats.roomCount,
      icon: DoorOpen,
      href: "/dashboard/rooms",
      color: "text-blue-600",
    },
    {
      title: "Devices",
      value: stats.deviceCount,
      icon: Monitor,
      href: "/dashboard/devices",
      color: "text-green-600",
    },
    {
      title: "Announcements",
      value: stats.announcementCount,
      icon: Volume2,
      href: "/dashboard/announcements",
      color: "text-purple-600",
    },
    {
      title: "Active Schedules",
      value: stats.scheduleCount,
      icon: Calendar,
      href: "/dashboard/schedules",
      color: "text-orange-600",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome to {organization.name}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge
            variant={
              organization.subscriptionStatus === "ACTIVE" ||
              organization.subscriptionStatus === "TRIAL"
                ? "default"
                : "destructive"
            }
          >
            {organization.subscriptionStatus}
          </Badge>
          <span className="text-sm text-gray-500">
            Timezone: {organization.timezone}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Device Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.devices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No devices yet.{" "}
              <Link
                href="/dashboard/devices"
                className="text-blue-600 hover:underline"
              >
                Add your first device
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              {stats.devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isDeviceOnline(device.lastSeenAt)
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-gray-500">
                        {device.room?.name || "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    {device.lastSeenAt
                      ? format(device.lastSeenAt, "MMM d, h:mm a")
                      : "Never"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
