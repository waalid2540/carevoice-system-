"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Volume2, Wifi, WifiOff, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  type: "TTS" | "MP3";
  text: string | null;
  audioUrl: string | null;
  language: string;
  voice: string | null;
}

interface ScheduleItem {
  id: string;
  timeOfDay: string;
  announcement: Announcement;
}

interface Schedule {
  device: { id: string; name: string };
  room: { id: string; name: string } | null;
  organization: { id: string; name: string; timezone: string };
  timezone: string;
  date: string;
  dayOfWeek: number;
  items: ScheduleItem[];
}

interface EmergencyBroadcast {
  active: boolean;
  id?: string;
  announcement?: Announcement;
  expiresAt?: string;
}

export default function PlayerPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = use(params);
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [emergency, setEmergency] = useState<EmergencyBroadcast | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] =
    useState<Announcement | null>(null);
  const [nextItem, setNextItem] = useState<ScheduleItem | null>(null);
  const playedItemsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const emergencyPlayedRef = useRef<string | null>(null);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if device is paired
  useEffect(() => {
    const storedDeviceId = localStorage.getItem("carevoice_device_id");
    if (!storedDeviceId || storedDeviceId !== deviceId) {
      router.push("/pair");
    }
  }, [deviceId, router]);

  // Fetch schedule
  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch(`/api/player/schedule?deviceId=${deviceId}`);
      if (!res.ok) throw new Error("Failed to fetch schedule");
      const data = await res.json();
      setSchedule(data);
      setIsOnline(true);

      // Cache schedule in localStorage
      localStorage.setItem(
        `carevoice_schedule_${deviceId}`,
        JSON.stringify(data)
      );
    } catch {
      setIsOnline(false);
      // Try to load from cache
      const cached = localStorage.getItem(`carevoice_schedule_${deviceId}`);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          // Only use cache if it's from today
          if (data.date === new Date().toISOString().split("T")[0]) {
            setSchedule(data);
          }
        } catch {
          // Invalid cache
        }
      }
    }
  }, [deviceId]);

  // Fetch emergency broadcast
  const fetchEmergency = useCallback(async () => {
    try {
      const res = await fetch(`/api/player/emergency?deviceId=${deviceId}`);
      if (!res.ok) throw new Error("Failed to fetch emergency");
      const data = await res.json();
      setEmergency(data);
    } catch {
      // Ignore errors for emergency check
    }
  }, [deviceId]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch("/api/player/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
    } catch {
      // Ignore heartbeat errors
    }
  }, [deviceId]);

  // Initial fetch and polling
  useEffect(() => {
    fetchSchedule();
    fetchEmergency();
    sendHeartbeat();

    // Poll schedule every 60 seconds
    const scheduleInterval = setInterval(fetchSchedule, 60000);
    // Poll emergency every 15 seconds
    const emergencyInterval = setInterval(fetchEmergency, 15000);
    // Send heartbeat every 60 seconds
    const heartbeatInterval = setInterval(sendHeartbeat, 60000);

    return () => {
      clearInterval(scheduleInterval);
      clearInterval(emergencyInterval);
      clearInterval(heartbeatInterval);
    };
  }, [fetchSchedule, fetchEmergency, sendHeartbeat]);

  // Find next announcement
  useEffect(() => {
    if (!schedule) return;

    const now = format(currentTime, "HH:mm");
    const upcoming = schedule.items.find((item) => item.timeOfDay > now);
    setNextItem(upcoming || null);
  }, [schedule, currentTime]);

  // Play announcement
  const playAnnouncement = useCallback(
    async (announcement: Announcement, scheduledAt: string) => {
      setIsPlaying(true);
      setCurrentAnnouncement(announcement);

      try {
        if (announcement.type === "MP3" && announcement.audioUrl) {
          // Play MP3
          const audio = new Audio(announcement.audioUrl);
          audioRef.current = audio;

          await new Promise<void>((resolve, reject) => {
            audio.onended = () => resolve();
            audio.onerror = () => reject(new Error("Audio playback failed"));
            audio.play().catch(reject);
          });

          // Log successful playback
          await fetch("/api/player/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deviceId,
              announcementId: announcement.id,
              scheduledAt,
              status: "PLAYED",
            }),
          });
        } else if (announcement.type === "TTS" && announcement.text) {
          // Use browser TTS
          const utterance = new SpeechSynthesisUtterance(announcement.text);
          utterance.lang = announcement.language || "en-US";

          await new Promise<void>((resolve, reject) => {
            utterance.onend = () => resolve();
            utterance.onerror = () => reject(new Error("TTS failed"));
            window.speechSynthesis.speak(utterance);
          });

          // Log successful playback
          await fetch("/api/player/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deviceId,
              announcementId: announcement.id,
              scheduledAt,
              status: "PLAYED",
            }),
          });
        }
      } catch (error) {
        console.error("Playback error:", error);
        // Log failed playback
        await fetch("/api/player/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId,
            announcementId: announcement.id,
            scheduledAt,
            status: "FAILED",
          }),
        });
      } finally {
        setIsPlaying(false);
        setCurrentAnnouncement(null);
        audioRef.current = null;
      }
    },
    [deviceId]
  );

  // Check for announcements to play
  useEffect(() => {
    if (!schedule || isPlaying) return;

    const now = format(currentTime, "HH:mm");
    const today = format(currentTime, "yyyy-MM-dd");

    // Check for scheduled items that should play now
    for (const item of schedule.items) {
      const itemKey = `${today}-${item.id}`;

      // Check if this item should play now and hasn't been played
      if (item.timeOfDay === now && !playedItemsRef.current.has(itemKey)) {
        playedItemsRef.current.add(itemKey);
        playAnnouncement(item.announcement, currentTime.toISOString());
        break;
      }
    }
  }, [schedule, currentTime, isPlaying, playAnnouncement]);

  // Handle emergency broadcasts
  useEffect(() => {
    if (!emergency?.active || isPlaying || !emergency.announcement) return;

    // Check if we've already played this emergency broadcast
    if (emergencyPlayedRef.current === emergency.id) return;

    emergencyPlayedRef.current = emergency.id!;
    playAnnouncement(emergency.announcement, new Date().toISOString());
  }, [emergency, isPlaying, playAnnouncement]);

  // Clear played items at midnight
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        playedItemsRef.current.clear();
        emergencyPlayedRef.current = null;
      }
    };

    const interval = setInterval(checkMidnight, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <Volume2 className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">
              {schedule?.organization.name || "CareVoice"}
            </h1>
            <p className="text-sm text-gray-400">
              {schedule?.room?.name || "Loading..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isOnline ? (
            <Wifi className="h-6 w-6 text-green-400" />
          ) : (
            <WifiOff className="h-6 w-6 text-red-400" />
          )}
          <span className="text-sm text-gray-400">
            {isOnline ? "Connected" : "Offline"}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Emergency indicator */}
        {emergency?.active && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-600 px-4 py-2 rounded-full animate-pulse">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Emergency Broadcast Active</span>
          </div>
        )}

        {/* Current time */}
        <div className="text-center mb-12">
          <div className="text-8xl font-bold tabular-nums">
            {format(currentTime, "h:mm")}
          </div>
          <div className="text-2xl text-gray-400">
            {format(currentTime, "a")}
          </div>
          <div className="text-xl text-gray-500 mt-2">
            {format(currentTime, "EEEE, MMMM d, yyyy")}
          </div>
        </div>

        {/* Currently playing */}
        {isPlaying && currentAnnouncement && (
          <div className="bg-blue-600/30 backdrop-blur-sm rounded-2xl p-8 mb-8 max-w-2xl w-full text-center animate-pulse">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Volume2 className="h-8 w-8 text-blue-400" />
              <span className="text-lg text-blue-300">Now Playing</span>
            </div>
            <h2 className="text-3xl font-bold">{currentAnnouncement.title}</h2>
            {currentAnnouncement.type === "TTS" && currentAnnouncement.text && (
              <p className="text-xl text-gray-300 mt-4">
                "{currentAnnouncement.text}"
              </p>
            )}
          </div>
        )}

        {/* Next announcement */}
        {!isPlaying && nextItem && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-gray-400" />
              <span className="text-gray-400">Next Announcement</span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              {nextItem.announcement.title}
            </h2>
            <p className="text-4xl font-bold text-blue-400">
              {nextItem.timeOfDay}
            </p>
          </div>
        )}

        {/* No upcoming announcements */}
        {!isPlaying && !nextItem && schedule && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full text-center">
            <p className="text-gray-400">No more announcements scheduled for today</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-gray-500">
        <p>Device: {schedule?.device.name || deviceId}</p>
      </footer>
    </div>
  );
}
