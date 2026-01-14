"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Monitor,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Room {
  id: string;
  name: string;
}

interface Device {
  id: string;
  name: string;
  roomId: string | null;
  room: Room | null;
  pairingCode: string | null;
  pairingExpiresAt: string | null;
  lastSeenAt: string | null;
  status: "PENDING" | "PAIRED" | "OFFLINE";
  createdAt: string;
}

function isDeviceOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return new Date(lastSeenAt) > twoMinutesAgo;
}

function isPairingCodeValid(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) > new Date();
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteDevice, setDeleteDevice] = useState<Device | null>(null);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [formName, setFormName] = useState("");
  const [formRoomId, setFormRoomId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [devicesRes, roomsRes] = await Promise.all([
        fetch("/api/devices"),
        fetch("/api/rooms"),
      ]);

      if (!devicesRes.ok || !roomsRes.ok) throw new Error("Failed to fetch");

      const [devicesData, roomsData] = await Promise.all([
        devicesRes.json(),
        roomsRes.json(),
      ]);

      setDevices(devicesData);
      setRooms(roomsData);
    } catch {
      toast.error("Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds to update online status
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleCreate() {
    if (!formName.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          roomId: formRoomId || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create device");
      }

      toast.success("Device created successfully");
      setIsCreateOpen(false);
      setFormName("");
      setFormRoomId("");
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create device"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editDevice || !formName.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/devices/${editDevice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          roomId: formRoomId || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update device");
      }

      toast.success("Device updated successfully");
      setIsEditOpen(false);
      setEditDevice(null);
      setFormName("");
      setFormRoomId("");
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update device"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteDevice) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/devices/${deleteDevice.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete device");
      }

      toast.success("Device deleted successfully");
      setDeleteDevice(null);
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete device"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegeneratePairingCode(deviceId: string) {
    setRegenerating(deviceId);

    try {
      const res = await fetch(`/api/devices/${deviceId}/pairing-code`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to regenerate code");
      }

      toast.success("Pairing code regenerated");
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate code"
      );
    } finally {
      setRegenerating(null);
    }
  }

  function copyPairingCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Pairing code copied");
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function openEdit(device: Device) {
    setEditDevice(device);
    setFormName(device.name);
    setFormRoomId(device.roomId || "");
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
          <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-600 mt-1">
            Manage TVs and tablets for playing announcements
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setFormName("");
                setFormRoomId("");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Device</DialogTitle>
              <DialogDescription>
                Create a new device and get a pairing code
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Device Name</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Main Room TV"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room">Room (optional)</Label>
                <Select value={formRoomId} onValueChange={setFormRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No room</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* Devices Grid */}
      {devices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Monitor className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              No devices yet. Add a device to start playing announcements.
            </p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => {
            const online = isDeviceOnline(device.lastSeenAt);
            const pairingValid = isPairingCodeValid(device.pairingExpiresAt);

            return (
              <Card key={device.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Monitor className="h-5 w-5 text-green-600" />
                        </div>
                        <div
                          className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                            online ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{device.name}</CardTitle>
                        <CardDescription>
                          {device.room?.name || "Unassigned"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(device)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDevice(device)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={online ? "default" : "secondary"}>
                      {online ? "Online" : "Offline"}
                    </Badge>
                    <Badge variant="outline">{device.status}</Badge>
                  </div>

                  {device.status === "PENDING" && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">
                          Pairing Code
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRegeneratePairingCode(device.id)
                          }
                          disabled={regenerating === device.id}
                        >
                          {regenerating === device.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {device.pairingCode && pairingValid ? (
                        <div className="flex items-center gap-2">
                          <code className="text-2xl font-mono font-bold tracking-widest">
                            {device.pairingCode}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              copyPairingCode(device.pairingCode!)
                            }
                          >
                            {copiedCode === device.pairingCode ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-orange-600">
                          Code expired. Regenerate a new code.
                        </p>
                      )}
                      {device.pairingExpiresAt && pairingValid && (
                        <p className="text-xs text-gray-500 mt-1">
                          Expires{" "}
                          {format(
                            new Date(device.pairingExpiresAt),
                            "h:mm a"
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {device.lastSeenAt && (
                    <p className="text-xs text-gray-500">
                      Last seen:{" "}
                      {format(new Date(device.lastSeenAt), "MMM d, h:mm a")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>Update device details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Device Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-room">Room</Label>
              <Select value={formRoomId} onValueChange={setFormRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No room</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
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
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteDevice}
        onOpenChange={() => setDeleteDevice(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDevice?.name}"? This
              action cannot be undone.
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
