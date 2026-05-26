"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WhisperStatus = "idle" | "recording" | "transcribing" | "error";

interface UseWhisperOptions {
  language?: "en-US" | "zh-CN";
  onTranscript?: (text: string) => void;
}

interface UseWhisperReturn {
  status: WhisperStatus;
  errorMessage: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

export function useWhisper({
  language = "en-US",
  onTranscript,
}: UseWhisperOptions = {}): UseWhisperReturn {
  const [status, setStatus] = useState<WhisperStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Check browser support after mount (avoids hydration mismatch)
  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "MediaRecorder" in window);
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage("Recording not supported in this browser.");
      setStatus("error");
      return;
    }

    setErrorMessage(null);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMessage("Microphone access denied. Please allow microphone access.");
      setStatus("error");
      return;
    }

    // Pick the best supported format — Safari uses mp4, Chrome uses webm
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    // When recording stops, send audio to Whisper API
    recorder.onstop = async () => {
      // Stop all mic tracks to release the browser mic indicator
      stream.getTracks().forEach((t) => t.stop());

      const audioBlob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];

      setStatus("transcribing");

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob);
        formData.append("language", language);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Transcription failed");

        const data = await res.json();
        if (data.transcript && onTranscript) {
          onTranscript(data.transcript);
        }
        setStatus("idle");
      } catch {
        setErrorMessage("Transcription failed. Check your OpenAI API key.");
        setStatus("error");
      }
    };

    recorder.start();
    setStatus("recording");
  }, [isSupported, language, onTranscript]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    // status will be set to "transcribing" inside onstop
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
    };
  }, []);

  return { status, errorMessage, isSupported, start, stop };
}
