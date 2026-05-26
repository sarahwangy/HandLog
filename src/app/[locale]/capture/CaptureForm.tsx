"use client";

// CaptureForm 是客户端组件（有状态、有交互）
// page.tsx 是服务端组件，把静态数据传进来
import { useState } from "react";

interface CaptureFormProps {
  today: string;
}

export default function CaptureForm({ today }: CaptureFormProps) {
  const [text, setText] = useState("");

  const charCount = text.length;

  return (
    <div>
      {/* 标题区 */}
      <h2 className="text-[#2C1F14] text-2xl mb-1" style={{ fontFamily: "Georgia, serif" }}>
        今天过得怎么样？
      </h2>
      <p className="text-[#8B6B4A] mb-6" style={{ fontFamily: "cursive" }}>
        📅 {today} · 草稿自动保存
      </p>

      {/* 麦克风按钮区（T-306 语音输入，暂时只做 UI） */}
      <div className="bg-[#F5EFE4] rounded-2xl p-5 border border-[rgba(139,107,74,0.2)] mb-5 text-center">
        <button className="w-[68px] h-[68px] rounded-full bg-[#2C1F14] flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg hover:bg-[#4A3728] transition-colors">
          🎙
        </button>
        <p className="text-sm text-[#8B6B4A]">点击录音</p>
        <p className="text-xs text-[#8B6B4A] opacity-60 mt-1">
          语音输入将在下个版本开放
        </p>
      </div>

      {/* 文字输入框（T-303） */}
      <textarea
        className="w-full h-[220px] bg-white border border-[rgba(139,107,74,0.2)] rounded-xl p-4 text-sm leading-relaxed text-[#2C1F14] resize-none outline-none focus:border-[#8B6B4A] transition-colors"
        style={{ fontFamily: "Georgia, serif" }}
        placeholder="写写今天发生了什么，不用精简，越真实越好..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {/* 字数统计 + 自动保存状态 */}
      <div className="flex justify-between items-center mt-2 mb-4">
        <span className="text-xs text-[#8B6B4A] opacity-60">
          已输入 {charCount} 字
        </span>
        <span className="text-xs text-[#7A8C6E]">
          {charCount > 0 ? "✓ 草稿已保存" : ""}
        </span>
      </div>

      {/* 提交按钮 */}
      <button
        className="w-full bg-[#2C1F14] text-[#FAF6F0] rounded-xl py-4 text-base hover:bg-[#4A3728] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={charCount < 10}
      >
        ✨ AI 开始整理复盘 →
      </button>
      {charCount < 10 && charCount > 0 && (
        <p className="text-xs text-[#C4907A] text-center mt-2">
          再多写一点（至少 10 字）
        </p>
      )}
    </div>
  );
}
