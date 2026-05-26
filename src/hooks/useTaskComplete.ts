"use client";

import { useCallback } from "react";

const PROJECT_NAME = "Weekly Journal Review";

// Plays a chime then speaks: "Weekly Journal Review — task complete, dear."
// Usage: const notify = useTaskComplete();  →  notify()  or  notify("Draft saved")
export function useTaskComplete() {
  const notify = useCallback((taskLabel?: string) => {
    playChime();

    // Small delay so chime plays first before voice starts
    setTimeout(() => {
      speak(taskLabel);
    }, 600);
  }, []);

  return notify;
}

// ── Chime (Web Audio API — no file needed) ──────────────────────────────────
function playChime() {
  try {
    const ctx = new AudioContext();

    // Two-note chime: C5 then E5
    const notes = [523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.value = freq;

      const startAt = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.4, startAt + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.6);

      osc.start(startAt);
      osc.stop(startAt + 0.6);
    });
  } catch {
    // AudioContext not available — silently skip chime
  }
}

// ── Text-to-speech (Web Speech API) ─────────────────────────────────────────
function speak(taskLabel?: string) {
  if (!("speechSynthesis" in window)) return;

  const message = taskLabel
    ? `${PROJECT_NAME} — ${taskLabel} complete, dear.`
    : `${PROJECT_NAME} — task complete, dear.`;

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.pitch = 1.1;

  // Pick a female voice if available
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(
    (v) => v.lang.startsWith("en") && /female|samantha|karen|victoria|moira/i.test(v.name)
  );
  if (femaleVoice) utterance.voice = femaleVoice;

  window.speechSynthesis.cancel(); // cancel any currently speaking
  window.speechSynthesis.speak(utterance);
}
