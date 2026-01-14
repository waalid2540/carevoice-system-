"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Volume2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Play,
  Square,
  Upload,
  FileAudio,
} from "lucide-react";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  type: "TTS" | "MP3";
  text: string | null;
  audioUrl: string | null;
  language: string;
  voice: string | null;
  createdAt: string;
}

const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
];

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteAnnouncement, setDeleteAnnouncement] =
    useState<Announcement | null>(null);
  const [editAnnouncement, setEditAnnouncement] = useState<Announcement | null>(
    null
  );
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formType, setFormType] = useState<"TTS" | "MP3">("TTS");
  const [formTitle, setFormTitle] = useState("");
  const [formText, setFormText] = useState("");
  const [formLanguage, setFormLanguage] = useState("en-US");
  const [formAudioUrl, setFormAudioUrl] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    try {
      const res = await fetch("/api/announcements");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAnnouncements(data);
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormType("TTS");
    setFormTitle("");
    setFormText("");
    setFormLanguage("en-US");
    setFormAudioUrl("");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes("audio")) {
      toast.error("Please select an audio file");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/uploads/audio", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload failed");
      }

      const data = await res.json();
      setFormAudioUrl(data.url);
      toast.success("Audio uploaded successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload audio"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    if (!formTitle.trim()) return;
    if (formType === "TTS" && !formText.trim()) {
      toast.error("Please enter text for the announcement");
      return;
    }
    if (formType === "MP3" && !formAudioUrl) {
      toast.error("Please upload an audio file");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          type: formType,
          text: formType === "TTS" ? formText : null,
          audioUrl: formType === "MP3" ? formAudioUrl : null,
          language: formLanguage,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create");
      }

      toast.success("Announcement created");
      setIsCreateOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editAnnouncement || !formTitle.trim()) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/announcements/${editAnnouncement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          text: formType === "TTS" ? formText : null,
          audioUrl: formType === "MP3" ? formAudioUrl : null,
          language: formLanguage,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update");
      }

      toast.success("Announcement updated");
      setIsEditOpen(false);
      setEditAnnouncement(null);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteAnnouncement) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/announcements/${deleteAnnouncement.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete");
      }

      toast.success("Announcement deleted");
      setDeleteAnnouncement(null);
      fetchAnnouncements();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(announcement: Announcement) {
    setEditAnnouncement(announcement);
    setFormType(announcement.type);
    setFormTitle(announcement.title);
    setFormText(announcement.text || "");
    setFormLanguage(announcement.language);
    setFormAudioUrl(announcement.audioUrl || "");
    setIsEditOpen(true);
  }

  function handlePlay(announcement: Announcement) {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();

    if (playingId === announcement.id) {
      setPlayingId(null);
      return;
    }

    setPlayingId(announcement.id);

    if (announcement.type === "MP3" && announcement.audioUrl) {
      const audio = new Audio(announcement.audioUrl);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        toast.error("Failed to play audio");
        setPlayingId(null);
      };
      audio.play();
    } else if (announcement.type === "TTS" && announcement.text) {
      const utterance = new SpeechSynthesisUtterance(announcement.text);
      utterance.lang = announcement.language;
      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => {
        toast.error("Failed to play TTS");
        setPlayingId(null);
      };
      window.speechSynthesis.speak(utterance);
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
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="audio/*"
        onChange={handleFileUpload}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600 mt-1">
            Create TTS or MP3 announcements to play on devices
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                Create a new audio announcement
              </DialogDescription>
            </DialogHeader>
            <Tabs
              value={formType}
              onValueChange={(v) => setFormType(v as "TTS" | "MP3")}
            >
              <TabsList className="w-full">
                <TabsTrigger value="TTS" className="flex-1">
                  Text-to-Speech
                </TabsTrigger>
                <TabsTrigger value="MP3" className="flex-1">
                  Upload MP3
                </TabsTrigger>
              </TabsList>
              <TabsContent value="TTS" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Lunch Time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={formLanguage} onValueChange={setFormLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text">Announcement Text</Label>
                  <Textarea
                    id="text"
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    placeholder="Enter the text to be spoken..."
                    rows={4}
                  />
                </div>
              </TabsContent>
              <TabsContent value="MP3" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="mp3-title">Title</Label>
                  <Input
                    id="mp3-title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Morning Music"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Audio File</Label>
                  {formAudioUrl ? (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <FileAudio className="h-5 w-5 text-blue-600" />
                      <span className="text-sm flex-1 truncate">
                        Audio uploaded
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormAudioUrl("")}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploading ? "Uploading..." : "Upload Audio File"}
                    </Button>
                  )}
                  <p className="text-xs text-gray-500">
                    Max file size: 10MB. Supported: MP3, WAV, OGG
                  </p>
                </div>
              </TabsContent>
            </Tabs>
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

      {/* Announcements Grid */}
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Volume2 className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              No announcements yet. Create your first announcement.
            </p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Announcement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Volume2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {announcement.title}
                      </CardTitle>
                      <CardDescription>
                        <Badge variant="outline" className="mt-1">
                          {announcement.type}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePlay(announcement)}
                    >
                      {playingId === announcement.id ? (
                        <Square className="h-4 w-4 text-red-500" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(announcement)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteAnnouncement(announcement)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {announcement.type === "TTS" && announcement.text && (
                  <p className="text-sm text-gray-600 line-clamp-3">
                    "{announcement.text}"
                  </p>
                )}
                {announcement.type === "MP3" && (
                  <p className="text-sm text-gray-500">Audio file uploaded</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Language:{" "}
                  {LANGUAGES.find((l) => l.value === announcement.language)
                    ?.label || announcement.language}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update announcement details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            {formType === "TTS" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-language">Language</Label>
                  <Select value={formLanguage} onValueChange={setFormLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-text">Announcement Text</Label>
                  <Textarea
                    id="edit-text"
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    rows={4}
                  />
                </div>
              </>
            )}
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
        open={!!deleteAnnouncement}
        onOpenChange={() => setDeleteAnnouncement(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteAnnouncement?.title}"?
              This will also remove it from any schedules.
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
