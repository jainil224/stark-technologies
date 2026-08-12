"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Loader2, AudioLines, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// VoiceRecorder
//
// Captures audio via the browser's MediaRecorder API. After the user stops
// recording, we simulate an ASR (automatic speech recognition) round-trip
// with a short "Transcribing…" delay and then call `onTranscript` with a
// placeholder transcript string.
//
// In production this component would post the recorded Blob to a backend ASR
// skill (e.g. the z-ai-web-dev-sdk ASR skill) and pass the real transcript
// through. For the mock layer we ship a realistic sample so the entire UX
// flow — record → review → edit → submit — is demonstrable end-to-end.
// ---------------------------------------------------------------------------

const SAMPLE_TRANSCRIPT =
  "Hello, I would like to report an issue in my area. The street light near my house has not been working for several days and it is very dark at night. Please look into this.";

type RecorderStatus = "idle" | "recording" | "transcribing";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onReset: () => void;
}

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function VoiceRecorder({ onTranscript, onReset }: VoiceRecorderProps) {
  const { t } = useTranslations();
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [supported, setSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcribeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Feature-detect MediaRecorder + getUserMedia on mount.
  // We must defer to an effect because `window`/`navigator` are not safe to
  // touch during SSR/hydration — the setState here is a one-time sync of an
  // external (browser) capability into React state.
  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof window.MediaRecorder === "function";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(ok);
  }, []);

  // Imperative helpers — kept as plain functions inside the component scope.
  // They only touch refs, so identity isn't important to React Compiler.
  function startTimer() {
    stopTimer();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }
  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }
  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  }

  // Clean up all resources on unmount.
  useEffect(() => {
    return () => {
      stopTimer();
      if (transcribeTimerRef.current) clearTimeout(transcribeTimerRef.current);
      stopStream();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        // Blob is captured here; in production we'd POST it to an ASR endpoint.
        // const audioBlob = new Blob(chunksRef.current, { type: mr.mimeType });
        stopStream();
        stopTimer();
        setStatus("transcribing");
        // Simulate ASR latency, then surface the placeholder transcript.
        transcribeTimerRef.current = setTimeout(() => {
          onTranscript(SAMPLE_TRANSCRIPT);
          setStatus("idle");
          setElapsed(0);
        }, 1200);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setElapsed(0);
      setStatus("recording");
      startTimer();
    } catch {
      // Permission denied or no mic available.
      toast.error(t("complaint.locationDenied"));
      stopStream();
      setStatus("idle");
      setElapsed(0);
    }
  }, [supported, onTranscript, t]);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
  }, []);

  const recordAgain = useCallback(() => {
    onReset();
    setElapsed(0);
    setStatus("idle");
    // Kick off a fresh recording.
    void startRecording();
  }, [onReset, startRecording]);

  if (!supported) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground"
        role="note"
      >
        <MicOff className="size-4 shrink-0" aria-hidden />
        <span>Voice recording is not supported in this browser. Please switch to text mode.</span>
      </div>
    );
  }

  const isRecording = status === "recording";
  const isTranscribing = status === "transcribing";

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      {/* aria-live region announces state changes for screen readers */}
      <div className="sr-only" aria-live="polite" role="status">
        {isRecording
          ? t("complaint.voiceRecording")
          : isTranscribing
            ? "Transcribing audio…"
            : "Recorder idle."}
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            aria-pressed={isRecording}
            aria-label={isRecording ? t("complaint.voiceStop") : t("complaint.voiceRecord")}
            className={cn(
              "relative flex size-12 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              isRecording
                ? "border-rose-300 bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {isRecording ? (
              <Square className="size-4" aria-hidden />
            ) : (
              <Mic className="size-5" aria-hidden />
            )}
            {isRecording ? (
              <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-rose-500/40" aria-hidden />
            ) : null}
          </button>

          <div className="min-w-[6rem]">
            {isRecording ? (
              <div className="flex items-center gap-2">
                <AudioLines className="size-4 text-rose-500" aria-hidden />
                <span className="font-mono text-sm font-medium tabular-nums text-rose-600">
                  {formatElapsed(elapsed)}
                </span>
              </div>
            ) : isTranscribing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                <span>Transcribing…</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("complaint.voiceRecord")}</p>
            )}
          </div>
        </div>

        {/* Animated bars: subtle waveform-style indicator while recording */}
        <div className="flex h-8 items-end gap-0.5" aria-hidden>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <span
              key={i}
              className={cn(
                "w-1 rounded-full",
                isRecording ? "bg-rose-400" : "bg-muted-foreground/20"
              )}
              style={{
                height: isRecording ? `${20 + Math.abs(Math.sin((elapsed + i) * 1.1)) * 70}%` : "20%",
                transition: "height 220ms ease",
              }}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={recordAgain}
          disabled={isRecording || isTranscribing}
          className="gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          {t("complaint.voiceRetake")}
        </Button>
      </div>
    </div>
  );
}
