"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PairPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Check if already paired
    const deviceId = localStorage.getItem("carevoice_device_id");
    if (deviceId) {
      router.push(`/player/${deviceId}`);
    }
  }, [router]);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    const newCode = [...code];

    for (let i = 0; i < 6 && i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }

    setCode(newCode);

    // Focus the last filled input or the next empty one
    const lastFilledIndex = Math.min(pastedData.length - 1, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const pairingCode = code.join("");
    if (pairingCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingCode }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Pairing failed");
      }

      const data = await res.json();

      // Store device info in localStorage
      localStorage.setItem("carevoice_device_id", data.deviceId);
      localStorage.setItem("carevoice_device_name", data.deviceName);
      localStorage.setItem(
        "carevoice_organization",
        JSON.stringify(data.organization)
      );
      if (data.room) {
        localStorage.setItem("carevoice_room", JSON.stringify(data.room));
      }

      toast.success("Device paired successfully!");

      // Redirect to player
      router.push(`/player/${data.deviceId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to pair device"
      );
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Volume2 className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">CareVoice</CardTitle>
          <p className="text-gray-600 mt-2">
            Enter the 6-digit pairing code from your admin dashboard
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex justify-center gap-2 mb-8">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-2xl font-mono"
                  disabled={loading}
                  autoFocus={index === 0}
                />
              ))}
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || code.some((d) => !d)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Pairing...
                </>
              ) : (
                "Pair Device"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
