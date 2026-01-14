"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  DoorOpen,
  Monitor,
  Volume2,
  Calendar,
  AlertTriangle,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Rooms", href: "/dashboard/rooms", icon: DoorOpen },
  { name: "Devices", href: "/dashboard/devices", icon: Monitor },
  { name: "Announcements", href: "/dashboard/announcements", icon: Volume2 },
  { name: "Schedules", href: "/dashboard/schedules", icon: Calendar },
  { name: "Emergency", href: "/dashboard/emergency", icon: AlertTriangle },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  // Demo mode user info
  const demoUser = {
    name: "Demo User",
    email: "demo@carevoice.app",
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Volume2 className="h-8 w-8 text-blue-500" />
          <span className="text-xl font-bold text-white">CareVoice System</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive
                    ? "text-blue-500"
                    : "text-gray-400 group-hover:text-white"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>D</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {demoUser.name}
            </p>
            <p className="text-xs text-gray-400 truncate">{demoUser.email}</p>
          </div>
        </div>
        <Link href="/">
          <Button
            variant="ghost"
            className="w-full mt-3 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Exit Demo
          </Button>
        </Link>
      </div>
    </div>
  );
}
