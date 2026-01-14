"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Volume2, Loader2, Radio, X } from "lucide-react";
import { toast } from "sonner";
import { format, addMinutes } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  type: "TTS" | "MP3";
}

interface EmergencyBroadcast {
  id: string;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  announcement: Announcement;
}

export default function EmergencyPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeBroadcast, setActiveBroadcast] =
    useState<EmergencyBroadcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  // Form state
  const [selectedAnnouncement, setSelectedAnnouncement] = useState("");
  const [duration, setDuration] = useState("15"); // minutes

  useEffect(() => {
    fetchData();
    // Poll for broadcast status
    const interval = setInterval(fetchBroadcast, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const [announcementsRes, broadcastRes] = await Promise.all([
        fetch("/api/announcements"),
        fetch("/api/emergency"),
      ]);

      if (announcementsRes.ok) {
        const data = await announcementsRes.json();
        setAnnouncements(data);
      }

      if (broadcastRes.ok) {
        const data = await broadcastRes.json();
        setActiveBroadcast(data);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function fetchBroadcast() {
    try {
      const res = await fetch("/api/emergency");
      if (res.ok) {
        const data = await res.json();
        setActiveBroadcast(data);
      }
    } catch {
      // Ignore polling errors
    }
  }

  async function handleBroadcast() {
    if (!selectedAnnouncement) {
      toast.error("Please select an announcement");
      return;
    }

    setSubmitting(true);

    try {
      const expiresAt =
        duration === "0"
          ? null
          : addMinutes(new Date(), parseInt(duration)).toISOString();

      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcementId: selectedAnnouncement,
          expiresAt,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to broadcast");
      }

      toast.success("Emergency broadcast started!");
      setShowConfirm(false);
      fetchBroadcast();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to broadcast"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!activeBroadcast) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/emergency/${activeBroadcast.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to cancel");
      }

      toast.success("Broadcast canceled");
      setShowCancel(false);
      setActiveBroadcast(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Emergency Broadcast</h1>
        <p className="text-gray-600 mt-1">
          Send an immediate announcement to all devices
        </p>
      </div>

      {/* Active Broadcast Alert */}
      {activeBroadcast && (
        <Card className="mb-8 border-red-500 bg-red-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full animate-pulse">
                  <Radio className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-900">
                    Active Emergency Broadcast
                  </CardTitle>
                  <CardDescription className="text-red-700">
                    "{activeBroadcast.announcement.title}" is playing on all
                    devices
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowCancel(true)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Broadcast
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm text-red-700">
              <div>
                <span className="font-medium">Started:</span>{" "}
                {format(new Date(activeBroadcast.createdAt), "h:mm a")}
              </div>
              {activeBroadcast.expiresAt && (
                <div>
                  <span className="font-medium">Expires:</span>{" "}
                  {format(new Date(activeBroadcast.expiresAt), "h:mm a")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Broadcast Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <CardTitle>Start New Broadcast</CardTitle>
              <CardDescription>
                This will immediately play on all devices in your organization
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Select Announcement</Label>
            <Select
              value={selectedAnnouncement}
              onValueChange={setSelectedAnnouncement}
            >
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Choose an announcement" />
              </SelectTrigger>
              <SelectContent>
                {announcements.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      {a.title} ({a.type})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="0">Until manually canceled</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              The broadcast will automatically stop after this duration
            </p>
          </div>

          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => setShowConfirm(true)}
            disabled={!selectedAnnouncement || !!activeBroadcast}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Start Emergency Broadcast
          </Button>

          {activeBroadcast && (
            <p className="text-sm text-orange-600">
              Cancel the active broadcast before starting a new one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirm Emergency Broadcast
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately play the selected announcement on ALL
              devices in your organization. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBroadcast}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Start Broadcast
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Broadcast</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the emergency broadcast on all devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>
              Keep Broadcasting
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Broadcast
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
