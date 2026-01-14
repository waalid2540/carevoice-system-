"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { DoorOpen, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Room {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    devices: number;
    scheduleItems: number;
  };
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [formName, setFormName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    try {
      const res = await fetch("/api/rooms");
      if (!res.ok) throw new Error("Failed to fetch rooms");
      const data = await res.json();
      setRooms(data);
    } catch {
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formName.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create room");
      }

      toast.success("Room created successfully");
      setIsCreateOpen(false);
      setFormName("");
      fetchRooms();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create room"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editRoom || !formName.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/rooms/${editRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update room");
      }

      toast.success("Room updated successfully");
      setIsEditOpen(false);
      setEditRoom(null);
      setFormName("");
      fetchRooms();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update room"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteRoom) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/rooms/${deleteRoom.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete room");
      }

      toast.success("Room deleted successfully");
      setDeleteRoom(null);
      fetchRooms();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete room"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(room: Room) {
    setEditRoom(room);
    setFormName(room.name);
    setIsEditOpen(true);
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
          <h1 className="text-3xl font-bold text-gray-900">Rooms</h1>
          <p className="text-gray-600 mt-1">
            Manage rooms where devices are located
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormName("")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Room</DialogTitle>
              <DialogDescription>
                Add a new room to your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Main Activity Room"
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

      {/* Rooms Grid */}
      {rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DoorOpen className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              No rooms yet. Add your first room to get started.
            </p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DoorOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{room.name}</CardTitle>
                      <CardDescription>
                        {room._count.devices} device
                        {room._count.devices !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(room)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteRoom(room)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  {room._count.scheduleItems} scheduled announcement
                  {room._count.scheduleItems !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>Update room details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Room Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
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
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteRoom}
        onOpenChange={() => setDeleteRoom(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRoom?.name}"? This action
              cannot be undone. Devices in this room will be unassigned.
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
