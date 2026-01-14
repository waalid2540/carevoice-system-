"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
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
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface Schedule {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  _count: {
    items: number;
  };
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteSchedule, setDeleteSchedule] = useState<Schedule | null>(null);
  const [formName, setFormName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  async function fetchSchedules() {
    try {
      const res = await fetch("/api/schedules");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSchedules(data);
    } catch {
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formName.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create");
      }

      toast.success("Schedule created");
      setIsCreateOpen(false);
      setFormName("");
      fetchSchedules();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(schedule: Schedule) {
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !schedule.active }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success(`Schedule ${schedule.active ? "deactivated" : "activated"}`);
      fetchSchedules();
    } catch {
      toast.error("Failed to update schedule");
    }
  }

  async function handleDelete() {
    if (!deleteSchedule) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/schedules/${deleteSchedule.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete");
      }

      toast.success("Schedule deleted");
      setDeleteSchedule(null);
      fetchSchedules();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete"
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedules</h1>
          <p className="text-gray-600 mt-1">
            Create and manage announcement schedules
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormName("")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Schedule</DialogTitle>
              <DialogDescription>
                Create a new announcement schedule
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Schedule Name</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Daily Schedule"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              No schedules yet. Create your first schedule.
            </p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{schedule.name}</CardTitle>
                      <CardDescription>
                        {schedule._count.items} item
                        {schedule._count.items !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                    <Badge variant={schedule.active ? "default" : "secondary"}>
                      {schedule.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${schedule.id}`} className="text-sm">
                        Active
                      </Label>
                      <Switch
                        id={`active-${schedule.id}`}
                        checked={schedule.active}
                        onCheckedChange={() => handleToggleActive(schedule)}
                      />
                    </div>
                    <Link href={`/dashboard/schedules/${schedule.id}`}>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteSchedule(schedule)}
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

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteSchedule}
        onOpenChange={() => setDeleteSchedule(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSchedule?.name}"? All
              schedule items will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
