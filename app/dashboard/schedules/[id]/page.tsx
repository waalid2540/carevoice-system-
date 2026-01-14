"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Calendar,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Room {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  type: "TTS" | "MP3";
}

interface ScheduleItem {
  id: string;
  timeOfDay: string;
  daysOfWeek: number[];
  enabled: boolean;
  order: number;
  announcement: Announcement;
  room: Room | null;
}

interface Schedule {
  id: string;
  name: string;
  active: boolean;
  items: ScheduleItem[];
}

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ScheduleItem | null>(null);
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formTime, setFormTime] = useState("09:00");
  const [formDays, setFormDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formRoomId, setFormRoomId] = useState<string>("");
  const [formAnnouncementId, setFormAnnouncementId] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [scheduleRes, roomsRes, announcementsRes] = await Promise.all([
        fetch(`/api/schedules/${id}`),
        fetch("/api/rooms"),
        fetch("/api/announcements"),
      ]);

      if (!scheduleRes.ok) {
        if (scheduleRes.status === 404) {
          router.push("/dashboard/schedules");
          return;
        }
        throw new Error("Failed to fetch");
      }

      const [scheduleData, roomsData, announcementsData] = await Promise.all([
        scheduleRes.json(),
        roomsRes.json(),
        announcementsRes.json(),
      ]);

      setSchedule(scheduleData);
      setRooms(roomsData);
      setAnnouncements(announcementsData);
    } catch {
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormTime("09:00");
    setFormDays([1, 2, 3, 4, 5]);
    setFormRoomId("");
    setFormAnnouncementId("");
  }

  async function handleAddItem() {
    if (!formAnnouncementId || formDays.length === 0) {
      toast.error("Please select an announcement and at least one day");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/schedules/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeOfDay: formTime,
          daysOfWeek: formDays,
          roomId: formRoomId || null,
          announcementId: formAnnouncementId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add item");
      }

      toast.success("Item added");
      setIsAddOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add item"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateItem() {
    if (!editItem) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/schedules/${id}/items/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeOfDay: formTime,
          daysOfWeek: formDays,
          roomId: formRoomId || null,
          announcementId: formAnnouncementId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update item");
      }

      toast.success("Item updated");
      setIsEditOpen(false);
      setEditItem(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update item"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleItem(item: ScheduleItem) {
    try {
      const res = await fetch(`/api/schedules/${id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !item.enabled }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success(`Item ${item.enabled ? "disabled" : "enabled"}`);
      fetchData();
    } catch {
      toast.error("Failed to update item");
    }
  }

  async function handleDeleteItem() {
    if (!deleteItem) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/schedules/${id}/items/${deleteItem.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Item deleted");
      setDeleteItem(null);
      fetchData();
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(item: ScheduleItem) {
    setEditItem(item);
    setFormTime(item.timeOfDay);
    setFormDays(item.daysOfWeek);
    setFormRoomId(item.room?.id || "");
    setFormAnnouncementId(item.announcement.id);
    setIsEditOpen(true);
  }

  function toggleDay(day: number) {
    if (formDays.includes(day)) {
      setFormDays(formDays.filter((d) => d !== day));
    } else {
      setFormDays([...formDays, day].sort());
    }
  }

  function formatDays(days: number[]): string {
    if (days.length === 7) return "Every day";
    if (
      days.length === 5 &&
      days.every((d) => d >= 1 && d <= 5)
    )
      return "Weekdays";
    if (
      days.length === 2 &&
      days.includes(0) &&
      days.includes(6)
    )
      return "Weekends";
    return days.map((d) => DAYS[d].label).join(", ");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!schedule) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/schedules">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-orange-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {schedule.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={schedule.active ? "default" : "secondary"}>
                  {schedule.active ? "Active" : "Inactive"}
                </Badge>
                <span className="text-gray-500">
                  {schedule.items.length} item
                  {schedule.items.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Schedule Item</DialogTitle>
              <DialogDescription>
                Add a new announcement to the schedule
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Days</Label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={
                        formDays.includes(day.value) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Room (optional)</Label>
                <Select value={formRoomId} onValueChange={setFormRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All rooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All rooms</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Announcement</Label>
                <Select
                  value={formAnnouncementId}
                  onValueChange={setFormAnnouncementId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select announcement" />
                  </SelectTrigger>
                  <SelectContent>
                    {announcements.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.title} ({a.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleAddItem} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Items List */}
      {schedule.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              No items in this schedule. Add your first announcement.
            </p>
            <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedule.items.map((item) => (
            <Card
              key={item.id}
              className={item.enabled ? "" : "opacity-60"}
            >
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-mono font-bold text-blue-600">
                      {item.timeOfDay}
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Volume2 className="h-4 w-4" />
                        {item.announcement.title}
                        <Badge variant="outline" className="ml-2">
                          {item.announcement.type}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.room?.name || "All rooms"} ·{" "}
                        {formatDays(item.daysOfWeek)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`enabled-${item.id}`}
                        checked={item.enabled}
                        onCheckedChange={() => handleToggleItem(item)}
                      />
                      <Label
                        htmlFor={`enabled-${item.id}`}
                        className="text-sm"
                      >
                        Enabled
                      </Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteItem(item)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule Item</DialogTitle>
            <DialogDescription>Update the schedule item</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Days</Label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={
                      formDays.includes(day.value) ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={formRoomId} onValueChange={setFormRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="All rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All rooms</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Announcement</Label>
              <Select
                value={formAnnouncementId}
                onValueChange={setFormAnnouncementId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select announcement" />
                </SelectTrigger>
                <SelectContent>
                  {announcements.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title} ({a.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule item?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
