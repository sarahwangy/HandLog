"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import type { WeekContext } from "@/app/api/chat/context/route";

// 把 **粗体** 和换行渲染成 JSX，不引入外部 markdown 库
function renderMarkdown(text: string) {
  return text.split("\n").map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, pi) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pi}>{part.slice(2, -2)}</strong>;
      }
      return <Fragment key={pi}>{part}</Fragment>;
    });
    return <span key={li}>{parts}{li < text.split("\n").length - 1 && <br />}</span>;
  });
}

interface Message {
  role: "user" | "assistant";
  content: string;
  saved?: boolean;
}

const QUICK_PROMPTS = [
  "我这几个月在哪些方面花了最多时间？",
  "我哪段时间状态最好？",
  "我在育儿上花了多少精力？",
  "我有没有在逃避什么？",
];

export default function ChatContent() {
  const [weeks, setWeeks] = useState<WeekContext[]>([]);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [ctxError, setCtxError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedAll, setSavedAll] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // 1. 页面加载时拉取 Notion 背景数据
  useEffect(() => {
    fetch("/api/chat/context")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setWeeks(d.weeks);
      })
      .catch((e) => setCtxError(e.message))
      .finally(() => setLoadingCtx(false));
  }, []);

  // 2. 自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // 3. 发送消息 + 流式接收
  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);

    // 先加一条空的 assistant 消息，边接收边填充
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, weeks }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: aiText };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "⚠️ 出错了，请重试",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  // 4. 单条保存/删除
  function toggleSaved(index: number) {
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, saved: !m.saved } : m))
    );
  }
  function deleteMsg(index: number) {
    setMessages((prev) => prev.filter((_, i) => i !== index));
  }

  // 5. 保存全部对话到 Notion
  async function saveAll() {
    setSaving(true);
    try {
      const res = await fetch("/api/chat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, saveAll: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedAll(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  // 6. 保存单条消息到 Notion
  async function saveSingle(index: number) {
    const msg = messages[index];
    try {
      await fetch("/api/chat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [msg], saveAll: true }),
      });
      toggleSaved(index);
    } catch {
      alert("保存失败");
    }
  }

  if (loadingCtx) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-[#8B6B4A] text-[14px]">正在读取日记数据...</p>
      </div>
    );
  }

  if (ctxError) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-[#C4783A] text-[14px]">{ctxError}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 flex flex-col"
      style={{ height: "calc(100vh - 56px - 60px)" }}>

      {/* 页面标题 */}
      <div className="py-4 border-b border-[#E4D4C0]">
        <h1 className="text-[20px] font-bold text-[#2C1F14]">💬 Deep Chat</h1>
        <p className="text-[13px] text-[#8B6B4A] mt-1">基于你的日记，深度分析你的想法和模式</p>
        <div className="inline-flex items-center gap-2 mt-2 bg-[#F5EDE0] border border-[#E4D4C0] rounded-full px-3 py-1 text-[12px] text-[#8B6B4A]">
          📓 已读取 <span className="text-[#C4783A] font-semibold">{weeks.length} 周</span> 日记
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="text-center text-[#B89A7A] text-[13px] py-8">
            对话开始 · AI 已读取你的全部日记
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed
              ${msg.role === "user"
                ? "bg-[#C4783A] text-white rounded-br-sm"
                : "bg-white border border-[#E4D4C0] text-[#2C1F14] rounded-bl-sm shadow-sm"
              }`}>
              {msg.content
                ? (msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content)
                : streaming && i === messages.length - 1
                  ? (
                    <span className="flex gap-1 items-center py-1">
                      <span className="w-2 h-2 rounded-full bg-[#C4A98A] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-[#C4A98A] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-[#C4A98A] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )
                  : null}
            </div>

            {msg.role === "assistant" && !streaming && msg.content && (
              <div className="flex gap-2 pl-1">
                <button
                  type="button"
                  onClick={() => saveSingle(i)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-colors
                    ${msg.saved
                      ? "bg-[#E8F5E8] border-[#8FBC8F] text-[#5A8A5A]"
                      : "bg-white border-[#E4D4C0] text-[#8B6B4A] hover:border-[#C4783A] hover:text-[#C4783A]"
                    }`}
                >
                  {msg.saved ? "✓ 已保存" : "💾 保存"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteMsg(i)}
                  className="text-[11px] px-3 py-1 rounded-full border border-[#E4D4C0] bg-white text-[#8B6B4A] hover:border-[#C4783A] hover:text-[#C4783A] transition-colors"
                >
                  🗑 删除
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="border-t border-[#E4D4C0] py-3 flex flex-col gap-2">

        {/* 快捷提问 */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="text-[12px] px-3 py-1 rounded-full border border-[#E4D4C0] bg-white text-[#8B6B4A] hover:border-[#C4783A] hover:text-[#C4783A] hover:bg-[#FDF5EE] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* 保存全部 */}
        {messages.length > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveAll}
              disabled={saving || savedAll}
              className="text-[12px] px-4 py-1 rounded-full border border-[#E4D4C0] bg-white text-[#8B6B4A] hover:border-[#C4783A] hover:text-[#C4783A] transition-colors disabled:opacity-50"
            >
              {savedAll ? "✓ 已保存到 Notion" : saving ? "保存中..." : "📋 保存全部对话到 Notion"}
            </button>
          </div>
        )}

        {/* 输入框 */}
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 min-h-[42px] max-h-[120px] px-4 py-2 border border-[#E4D4C0] rounded-xl text-[14px] font-[inherit] resize-none outline-none bg-white text-[#2C1F14] placeholder:text-[#C4A98A] focus:border-[#C4783A] leading-relaxed"
            placeholder="问任何关于你自己的问题..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            disabled={streaming}
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="w-[42px] h-[42px] rounded-xl border-none bg-[#C4783A] text-white text-[18px] flex-shrink-0 hover:bg-[#A85E28] disabled:bg-[#EDD4BC] disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
