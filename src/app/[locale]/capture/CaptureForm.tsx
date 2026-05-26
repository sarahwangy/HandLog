"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAutosave } from "@/hooks/useAutosave";
import { useWhisper } from "@/hooks/useWhisper";
import { useTaskComplete } from "@/hooks/useTaskComplete";

interface CaptureFormProps {
  today: string;
  dateKey: string; // "2026-05-26" 格式，用于 KV key
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

  // 页面加载时从 KV 读取今天的草稿（如果有的话）
  useEffect(() => {
    fetch(`/api/draft?date=${dateKey}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.content) setText(data.content);
      })
      .finally(() => setLoading(false));
  }, [dateKey]);

  const charCount = text.length;

  const saveLabel =
    status === "saving" ? "Saving..." :
    status === "saved"  ? "✓ Draft saved" :
    status === "error"  ? "Save failed, try again" :
    charCount > 0       ? "Waiting to save..." : "";

  return (
    <div>
      {/* 标题区 */}
      <h2 className="text-[#2C1F14] text-2xl mb-1 font-serif">
        How was your day?
      </h2>
      <p className="text-[#8B6B4A] mb-6 font-serif">
        📅 {today} · Draft autosaves
      </p>

      {/* 麦克风按钮区 */}
      <div className="bg-[#F5EFE4] rounded-2xl p-5 border border-[rgba(139,107,74,0.2)] mb-5 text-center">
        <button
          type="button"
          onClick={micStatus === "recording" ? stopMic : startMic}
          disabled={!micSupported || micStatus === "transcribing"}
          className={`w-[68px] h-[68px] rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed
            ${micStatus === "recording"
              ? "bg-[#C4907A] animate-pulse"
              : micStatus === "transcribing"
              ? "bg-[#8B6B4A]"
              : "bg-[#4A3728] hover:bg-[#5C4535]"
            }`}
        >
          🎙
        </button>

        {micStatus === "recording" ? (
          <>
            <p className="text-sm text-[#C4907A] font-medium">Recording... tap to stop</p>
            <p className="text-xs text-[#8B6B4A] opacity-60 mt-1">Speak naturally, tap stop when done</p>
          </>
        ) : micStatus === "transcribing" ? (
          <>
            <p className="text-sm text-[#8B6B4A] font-medium">Transcribing...</p>
            <p className="text-xs text-[#8B6B4A] opacity-60 mt-1">Whisper is converting your speech</p>
          </>
        ) : micError ? (
          <p className="text-xs text-[#C4907A] mt-1">{micError}</p>
        ) : !micSupported ? (
          <p className="text-xs text-[#8B6B4A] opacity-60 mt-1">Recording not supported in this browser</p>
        ) : (
          <>
            <p className="text-sm text-[#8B6B4A]">Tap to record</p>
            <p className="text-xs text-[#8B6B4A] opacity-60 mt-1">Powered by Whisper — punctuation included</p>
          </>
        )}
      </div>

      {/* 文字输入框（T-303） */}
      <textarea
        className="w-full h-[220px] bg-white border border-[rgba(139,107,74,0.2)] rounded-xl p-4 text-sm leading-relaxed text-[#2C1F14] resize-none outline-none focus:border-[#8B6B4A] transition-colors font-serif disabled:opacity-50"
        placeholder={loading ? "Loading draft..." : "Write about your day — no need to edit, the messier the better..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={saveNow}
        disabled={loading}
      />

      {/* 字数统计 + 自动保存状态 */}
      <div className="flex justify-between items-center mt-2 mb-4">
        <span className="text-xs text-[#8B6B4A] opacity-60">
          {charCount} characters
        </span>
        <span className={`text-xs ${status === "error" ? "text-[#C4907A]" : "text-[#7A8C6E]"}`}>
          {saveLabel}
        </span>
      </div>

      {/* 提交按钮 */}
      <button
        type="button"
        onClick={() => { saveNow(); router.push(`/${locale}/review`); }}
        className="w-full bg-[#2C1F14] text-[#FAF6F0] rounded-xl py-4 text-base hover:bg-[#4A3728] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={charCount < 10}
      >
        ✨ Generate my review →
      </button>
      {charCount < 10 && charCount > 0 && (
        <p className="text-xs text-[#C4907A] text-center mt-2">
          Write a bit more (at least 10 characters)
        </p>
      )}
    </div>
  );
}
