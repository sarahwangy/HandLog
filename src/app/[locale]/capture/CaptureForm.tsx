"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAutosave } from "@/hooks/useAutosave";
import { useWhisper } from "@/hooks/useWhisper";
import { useTaskComplete } from "@/hooks/useTaskComplete";

interface CaptureFormProps {
  today: string;
  dateKey: string;
}

export default function CaptureForm({ today, dateKey }: CaptureFormProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const locale = useLocale();
  const { status, saveNow } = useAutosave({ content: text, date: dateKey });
  const notify = useTaskComplete();

  const { status: micStatus, errorMessage: micError, isSupported: micSupported, start: startMic, stop: stopMic } =
    useWhisper({
      onTranscript: (chunk) => {
        setText((prev) => prev ? `${prev} ${chunk}` : chunk);
        notify("Voice transcription");
      },
    });

  useEffect(() => {
    fetch(`/api/draft?date=${dateKey}`)
      .then((r) => r.json())
      .then((data) => { if (data.content) setText(data.content); })
      .finally(() => setLoading(false));
  }, [dateKey]);

  const charCount = text.length;

  const saveLabel =
    status === "saving" ? "Saving..." :
    status === "saved"  ? "✓ Draft saved" :
    status === "error"  ? "Save failed" :
    charCount > 0       ? "Waiting to save..." : "";

  return (
    <div>
      <h2 className="text-[26px] font-bold text-[#2C1F14] mb-1">How was your day?</h2>
      <p className="text-[14px] text-[#8B6B4A] mb-7">
        📅 {today} · Draft autosaves every 3 seconds
      </p>

      {/* 语音录音区 */}
      <div className="bg-[#F5EDE0] rounded-[14px] px-6 py-7 border border-[#E4D4C0] mb-4 text-center">
        <button
          type="button"
          onClick={micStatus === "recording" ? stopMic : startMic}
          disabled={!micSupported || micStatus === "transcribing"}
          className={`w-[68px] h-[68px] rounded-full flex items-center justify-center text-[26px] mx-auto mb-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
            shadow-[rgba(80,40,10,0.03)_0_0_0_1px,rgba(80,40,10,0.08)_0_4px_12px]
            ${micStatus === "recording"
              ? "bg-[#A85E28] animate-pulse"
              : micStatus === "transcribing"
              ? "bg-[#8B6B4A]"
              : "bg-[#C4783A] hover:bg-[#A85E28]"
            }`}
        >
          🎙
        </button>

        {micStatus === "recording" ? (
          <>
            <p className="text-[15px] font-semibold text-[#A85E28]">Recording... tap to stop</p>
            <p className="text-[13px] text-[#8B6B4A] mt-1 opacity-70">Speak naturally, tap stop when done</p>
          </>
        ) : micStatus === "transcribing" ? (
          <>
            <p className="text-[15px] font-semibold text-[#8B6B4A]">Transcribing...</p>
            <p className="text-[13px] text-[#8B6B4A] mt-1 opacity-60">Whisper is converting your speech</p>
          </>
        ) : micError ? (
          <p className="text-[13px] text-[#C4783A] mt-1">{micError}</p>
        ) : !micSupported ? (
          <p className="text-[13px] text-[#8B6B4A] opacity-60 mt-1">Recording not supported in this browser</p>
        ) : (
          <>
            <p className="text-[15px] font-bold text-[#2C1F14]">Tap to record</p>
            <p className="text-[13px] text-[#8B6B4A] mt-1 opacity-70">Powered by Whisper — punctuation included</p>
          </>
        )}
      </div>

      {/* 文字输入框 */}
      <textarea
        className="w-full h-[200px] bg-[#FDFAF6] border border-[#E4D4C0] rounded-[14px] font-[inherit] p-4 text-[15px] leading-relaxed text-[#2C1F14] resize-none outline-none focus:border-[#C4A98A] focus:border-2 transition-colors disabled:opacity-50 placeholder:text-[#B89A7A]"
        placeholder={loading ? "Loading draft..." : "Write about your day — no need to edit, the messier the better..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={saveNow}
        disabled={loading}
      />

      {/* 字数 + 保存状态 */}
      <div className="flex justify-between items-center mt-2 mb-5">
        <span className="text-[13px] text-[#8B6B4A]">{charCount} characters</span>
        <span className={`text-[13px] ${status === "error" ? "text-[#C4783A]" : "text-[#6B8F5E]"}`}>
          {saveLabel}
        </span>
      </div>

      {/* 提交按钮 */}
      <button
        type="button"
        onClick={() => { saveNow(); router.push(`/${locale}/review`); }}
        className="w-full h-[48px] bg-[#C4783A] text-white rounded-[8px] text-[15px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed flex items-center justify-center gap-2"
        disabled={charCount < 10}
      >
        ✨ Generate my review →
      </button>

      {charCount < 10 && charCount > 0 && (
        <p className="text-[13px] text-[#C4783A] text-center mt-2">
          Write a bit more (at least 10 characters)
        </p>
      )}
    </div>
  );
}
