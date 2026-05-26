"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionStatus = "idle" | "recording" | "error";

interface UseSpeechRecognitionOptions {
  language?: string;       // e.g. "en-US", "zh-CN"
  onTranscript?: (text: string) => void; // called with each new chunk
}

interface UseSpeechRecognitionReturn {
  status: RecognitionStatus;
  errorMessage: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition({
  language = "en-US",
  onTranscript,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Start as false on both server and client to avoid hydration mismatch.
  // Set the real value after mount (client only).
  const [isSupported, setIsSupported] = useState(false);
  useEffect(() => {
    setIsSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Build a fresh SpeechRecognition instance
  const createRecognition = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // Only process results starting from resultIndex to avoid duplicates.
      // event.resultIndex points to the first NEW result in this event.
      let newText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newText += event.results[i][0].transcript;
        }
      }
      if (newText.trim() && onTranscript) {
        onTranscript(newText.trim());
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      // "no-speech" is normal — user just paused; don't show as error
      if (event.error === "no-speech") return;

      const messages: Record<string, string> = {
        "not-allowed": "Microphone access denied. Please allow microphone in browser settings.",
        "audio-capture": "No microphone found.",
        "network": "Network error during speech recognition.",
        "aborted": "",
      };
      const msg = messages[event.error] ?? `Speech error: ${event.error}`;
      if (msg) {
        setErrorMessage(msg);
        setStatus("error");
      }
    };

    recognition.onend = () => {
      // onend fires when recognition stops for any reason
      // Only reset to idle if we didn't already set an error
      setStatus((prev) => (prev === "recording" ? "idle" : prev));
    };

    return recognition;
  }, [language, onTranscript]);

  const start = useCallback(() => {
    if (!isSupported) {
      setErrorMessage("Speech recognition is not supported in this browser. Try Chrome.");
      setStatus("error");
      return;
    }

    setErrorMessage(null);
    const recognition = createRecognition();
    recognitionRef.current = recognition;
    recognition.start();
    setStatus("recording");
  }, [isSupported, createRecognition]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus("idle");
  }, []);

  // Clean up on unmount — stop any active recognition
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { status, errorMessage, isSupported, start, stop };
}
