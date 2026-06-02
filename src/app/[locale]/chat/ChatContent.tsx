"use client";

import { useState, useEffect, useRef, Fragment } from "react";

// ── Markdown 渲染 ─────────────────────────────────────────────────────────────

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, pi) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={pi}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={pi}>{part}</Fragment>;
  });
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  function flushBullets() {
    if (bulletBuffer.length === 0) return;
    nodes.push(
      <ul key={key++} className="list-disc list-outside pl-5 my-1 space-y-0.5">
        {bulletBuffer.map((item, i) => (
          <li key={i} className="text-[14px] leading-relaxed">{renderInline(item)}</li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  }

  for (const line of lines) {
    if (/^[-─]{3,}$/.test(line.trim())) {
      flushBullets(); nodes.push(<hr key={key++} className="my-3 border-[#E4D4C0]" />); continue;
    }
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) { flushBullets(); nodes.push(<p key={key++} className="text-[15px] font-bold text-[#2C1F14] mt-3 mb-1">{h2[1]}</p>); continue; }
    const h3 = line.match(/^###\s+(.+)/);
    if (h3) { flushBullets(); nodes.push(<p key={key++} className="text-[13px] font-semibold text-[#4A3324] mt-2 mb-0.5">{h3[1]}</p>); continue; }
    const numbered = line.match(/^(\d+)\.\s+(.+)/);
    if (numbered && line.length <= 80) {
      flushBullets();
      nodes.push(<p key={key++} className="text-[14px] font-semibold text-[#2C1F14] mt-3 mb-0.5">{numbered[1]}. {renderInline(numbered[2])}</p>);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) { bulletBuffer.push(bullet[1]); continue; }
    if (!line.trim()) { flushBullets(); nodes.push(<br key={key++} />); continue; }
    flushBullets();
    nodes.push(<span key={key++} className="block leading-relaxed">{renderInline(line)}</span>);
  }
  flushBullets();
  return nodes;
}

// ── 类型 & 常量 ───────────────────────────────────────────────────────────────

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

const MOODS = [
  { emoji: "😌", label: "平静", hint: "语气平和，娓娓道来" },
  { emoji: "😊", label: "开心", hint: "语气积极，多看亮点" },
  { emoji: "😔", label: "低落", hint: "语气温柔，多给鼓励" },
  { emoji: "😤", label: "焦虑", hint: "语气稳定，帮我理清" },
  { emoji: "🤔", label: "困惑", hint: "语气清晰，帮我分析" },
];

const STORAGE_KEY = "handlog-chat-messages";

// 多语言问候语列表
const GREETINGS = [
  { text: "你好", lang: "中文" },
  { text: "Hello", lang: "English" },
  { text: "こんにちは", lang: "日本語" },
  { text: "안녕하세요", lang: "한국어" },
  { text: "Bonjour", lang: "Français" },
  { text: "Hallo", lang: "Deutsch" },
  { text: "Hola", lang: "Español" },
  { text: "Ciao", lang: "Italiano" },
  { text: "Привет", lang: "Русский" },
  { text: "مرحبا", lang: "العربية" },
  { text: "नमस्ते", lang: "हिन्दी" },
];

// 渐变色组，循环切换
const GRADIENT_COLORS = [
  "from-[#C4783A] to-[#E8A56A]",
  "from-[#7B5EA7] to-[#C4783A]",
  "from-[#3A7BC4] to-[#7B5EA7]",
  "from-[#C43A7B] to-[#E87B5E]",
  "from-[#3AC47B] to-[#3A7BC4]",
  "from-[#E8A56A] to-[#C43A7B]",
];

// ── 组件 ──────────────────────────────────────────────────────────────────────

export default function ChatContent() {
  const [weekCount, setWeekCount] = useState(0);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [ctxError, setCtxError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [mood, setMood] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedAll, setSavedAll] = useState(false);

  // 记忆本
  const [memoryCount, setMemoryCount] = useState(0);
  const [savingMemory, setSavingMemory] = useState<number | null>(null); // 正在保存的消息 index

  // 多语言问候循环
  const [greetingIdx, setGreetingIdx] = useState(0);
  const [greetingVisible, setGreetingVisible] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 多语言问候循环：每 2s 淡出 → 切换 → 淡入
  useEffect(() => {
    const timer = setInterval(() => {
      setGreetingVisible(false);
      setTimeout(() => {
        setGreetingIdx((i) => (i + 1) % GREETINGS.length);
        setGreetingVisible(true);
      }, 400);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  // 1. 拉取 Notion 背景数据
  useEffect(() => {
    fetch("/api/chat/context")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setWeekCount(d.count);
      })
      .catch((e) => setCtxError(e.message))
      .finally(() => setLoadingCtx(false));
  }, []);

  // 1b. 拉取记忆本条数（静默，失败不影响）
  useEffect(() => {
    fetch("/api/chat/memory")
      .then((r) => r.json())
      .then((d) => { if (d.memories) setMemoryCount(d.memories.length); })
      .catch(() => {});
  }, []);

  // 1c. 从 localStorage 恢复对话历史
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch { /* 忽略解析错误 */ }
  }, []);

  // 1c. 对话变化时保存到 localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // 2. 自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // 3. 发送消息 + 流式接收
  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;
    setInput("");
    setSavedAll(false);

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, mood }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Request failed");
        throw new Error(errText || "Request failed");
      }

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
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // 用户手动停止，保留已有内容，不显示错误
        return;
      }
      const errMsg = err instanceof Error ? err.message : "未知错误";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: `⚠️ 出错了：${errMsg}` };
        return updated;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  // 停止流式输出
  function stopStreaming() {
    abortRef.current?.abort();
  }

  // 清空对话历史
  function clearHistory() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  // 保存 AI 消息到记忆本
  async function saveMemory(index: number) {
    const msg = messages[index];
    if (!msg || msg.role !== "assistant") return;
    setSavingMemory(index);
    try {
      // 截取前 200 字作为洞察摘要
      const text = msg.content.replace(/\n+/g, " ").trim().slice(0, 200);
      const res = await fetch("/api/chat/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("保存失败");
      setMemoryCount((n) => n + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingMemory(null);
    }
  }

  // 导出对话为 PDF（打开新窗口 → 触发打印）
  // 把 markdown 文字转成可读 HTML（用于 PDF）
  function mdToHtml(text: string): string {
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const inlineBold = (s: string) => escape(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    const lines = text.split("\n");
    const out: string[] = [];
    let bulletBuf: string[] = [];

    function flushBullets() {
      if (!bulletBuf.length) return;
      out.push(`<ul>${bulletBuf.map(b => `<li>${inlineBold(b)}</li>`).join("")}</ul>`);
      bulletBuf = [];
    }

    for (const line of lines) {
      if (/^-{3,}$/.test(line.trim())) { flushBullets(); out.push("<hr>"); continue; }
      const h2 = line.match(/^##\s+(.+)/);
      const h3 = line.match(/^###\s+(.+)/);
      const bullet = line.match(/^[-*]\s+(.+)/);
      const numbered = line.match(/^(\d+)\.\s+(.+)/);
      if (h2)       { flushBullets(); out.push(`<h2>${inlineBold(h2[1])}</h2>`); }
      else if (h3)  { flushBullets(); out.push(`<h3>${inlineBold(h3[1])}</h3>`); }
      else if (numbered && line.length <= 80) { flushBullets(); out.push(`<h3>${numbered[1]}. ${inlineBold(numbered[2])}</h3>`); }
      else if (bullet) { bulletBuf.push(bullet[1]); }
      else if (!line.trim()) { flushBullets(); out.push("<br>"); }
      else { flushBullets(); out.push(`<p>${inlineBold(line)}</p>`); }
    }
    flushBullets();
    return out.join("\n");
  }

  function exportPDF() {
    const blocks = messages.map((m) => {
      if (m.role === "user") {
        const escaped = m.content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<div class="bubble user"><div class="role">🙋 我</div><p>${escaped}</p></div>`;
      } else {
        return `<div class="bubble assistant"><div class="role">🤖 AI</div><div class="md">${mdToHtml(m.content)}</div></div>`;
      }
    }).join("\n");

    const now = new Date().toLocaleString("zh-CN", { timeZone: "Australia/Melbourne" });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Chat 记录 · ${now}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Helvetica Neue", sans-serif; max-width: 720px; margin: 0 auto; padding: 36px 32px; color: #2C1F14; background: #FAF6F0; }
  h1 { font-size: 17px; color: #C4783A; font-weight: 700; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #E4D4C0; }
  .bubble { border-radius: 14px; padding: 14px 18px; margin-bottom: 14px; }
  .bubble.user { background: #C4783A; color: white; margin-left: 60px; }
  .bubble.user .role { font-size: 11px; opacity: 0.8; margin-bottom: 6px; }
  .bubble.user p { font-size: 14px; line-height: 1.7; }
  .bubble.assistant { background: white; border: 1px solid #E4D4C0; margin-right: 60px; }
  .bubble.assistant .role { font-size: 11px; color: #B89A7A; margin-bottom: 8px; }
  .md p { font-size: 14px; line-height: 1.75; color: #2C1F14; margin: 6px 0; }
  .md h2 { font-size: 15px; font-weight: 700; color: #2C1F14; margin: 14px 0 4px; }
  .md h3 { font-size: 13px; font-weight: 600; color: #4A3324; margin: 10px 0 3px; }
  .md ul { padding-left: 18px; margin: 6px 0; }
  .md li { font-size: 14px; line-height: 1.7; margin-bottom: 3px; }
  .md hr { border: none; border-top: 1px solid #E4D4C0; margin: 12px 0; }
  .md strong { font-weight: 600; }
  br { display: block; margin: 4px 0; }
  @media print { body { background: white; padding: 20px; } .bubble.user { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<h1>💬 Chat 记录 · ${now}</h1>
${blocks}
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.documentElement.innerHTML = html;
    setTimeout(() => win.print(), 300);
  }

  // 单条保存/删除
  function toggleSaved(index: number) {
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, saved: !m.saved } : m)));
  }
  function deleteMsg(index: number) {
    setMessages((prev) => prev.filter((_, i) => i !== index));
  }

  function getTopic(msgs: Message[]) {
    const first = msgs.find((m) => m.role === "user");
    if (!first) return "";
    return first.content.length > 20 ? first.content.slice(0, 20) + "…" : first.content;
  }

  async function saveAll() {
    setSaving(true);
    try {
      const res = await fetch("/api/chat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, saveAll: true, topic: getTopic(messages) }),
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

  async function saveSingle(index: number) {
    const msg = messages[index];
    try {
      await fetch("/api/chat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [msg], saveAll: false, topic: getTopic(messages) }),
      });
      toggleSaved(index);
    } catch {
      alert("保存失败");
    }
  }

  if (loadingCtx) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-[#8B6B4A] text-[14px]">正在读取日记数据...</p>
    </div>
  );

  if (ctxError) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-[#C4783A] text-[14px]">{ctxError}</p>
    </div>
  );

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 flex flex-col"
      style={{ height: "calc(100vh - 56px - 60px)" }}>

      {/* 页面标题 */}
      <div className="py-4 border-b border-[#E4D4C0] flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#2C1F14]">💬 Deep Chat</h1>
          <p className="text-[13px] text-[#8B6B4A] mt-1">基于你的日记，深度分析你的想法和模式</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="inline-flex items-center gap-2 bg-[#F5EDE0] border border-[#E4D4C0] rounded-full px-3 py-1 text-[12px] text-[#8B6B4A]">
              📓 已读取 <span className="text-[#C4783A] font-semibold">{weekCount} 周</span> 日记
            </div>
            {memoryCount > 0 && (
              <div className="inline-flex items-center gap-1 bg-[#F0EEFF] border border-[#C8BBEE] rounded-full px-3 py-1 text-[12px] text-[#7B5EA7]">
                🧠 <span className="font-semibold">{memoryCount} 条</span> 记忆
              </div>
            )}
          </div>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={clearHistory}
            className="text-[12px] text-[#B89A7A] hover:text-[#C4783A] mt-1 transition-colors">
            清空历史
          </button>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">

        {/* 4. 开场引导语 */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-6">
            {/* 跳动的心形图标 */}
            <div className="text-[44px] select-none animate-heartbeat">❤️</div>

            {/* 多语言问候渐变文字 */}
            <div className="h-[32px] flex flex-col items-center justify-center">
              <span
                className={`greeting-fade text-[22px] font-bold bg-gradient-to-r ${GRADIENT_COLORS[greetingIdx % GRADIENT_COLORS.length]} bg-clip-text text-transparent ${greetingVisible ? "greeting-visible" : "greeting-hidden"}`}>
                {GREETINGS[greetingIdx].text}
              </span>
            </div>

            <p className="text-[13px] text-[#8B6B4A] text-center max-w-[280px] leading-relaxed">
              我读完了你的日记。有什么想聊的？可以问我你这段时间的状态、规律，或者任何你好奇的事。
            </p>
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
                      <span className="w-2 h-2 rounded-full bg-[#C4A98A] animate-bounce bounce-delay-0" />
                      <span className="w-2 h-2 rounded-full bg-[#C4A98A] animate-bounce bounce-delay-150" />
                      <span className="w-2 h-2 rounded-full bg-[#C4A98A] animate-bounce bounce-delay-300" />
                    </span>
                  )
                  : null}
            </div>

            {msg.role === "assistant" && !streaming && msg.content && (
              <div className="flex gap-2 pl-1">
                <button type="button" onClick={() => saveSingle(i)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-colors
                    ${msg.saved ? "bg-[#E8F5E8] border-[#8FBC8F] text-[#5A8A5A]"
                      : "bg-white border-[#E4D4C0] text-[#8B6B4A] hover:border-[#C4783A] hover:text-[#C4783A]"}`}>
                  {msg.saved ? "✓ 已保存" : "💾 保存"}
                </button>
                <button type="button" onClick={() => saveMemory(i)}
                  disabled={savingMemory === i}
                  className="text-[11px] px-3 py-1 rounded-full border border-[#E4D4C0] bg-white text-[#8B6B4A] hover:border-[#7B5EA7] hover:text-[#7B5EA7] transition-colors disabled:opacity-50"
                  title="保存这条洞察到记忆本，下次对话时 AI 会记得">
                  {savingMemory === i ? "保存中..." : "🧠 记住这条"}
                </button>
                <button type="button" onClick={() => deleteMsg(i)}
                  className="text-[11px] px-3 py-1 rounded-full border border-[#E4D4C0] bg-white text-[#8B6B4A] hover:border-[#C4783A] hover:text-[#C4783A] transition-colors">
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

        {/* 快捷提问（无对话时） */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((q) => (
              <button key={q} type="button" onClick={() => sendMessage(q)}
                className="text-[12px] px-3 py-1 rounded-full border border-[#E4D4C0] bg-white text-[#8B6B4A] hover:border-[#C4783A] hover:text-[#C4783A] hover:bg-[#FDF5EE] transition-colors">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* 6. 情绪标签 */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#B89A7A]">现在的状态：</span>
          <div className="flex gap-1">
            {MOODS.map((m) => (
              <button key={m.label} type="button"
                title={m.hint}
                onClick={() => setMood(mood === m.label ? null : m.label)}
                className={`text-[18px] w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all
                  ${mood === m.label
                    ? "bg-[#FDDBB0] ring-2 ring-[#C4783A] scale-110"
                    : "hover:bg-[#FDDBB0] opacity-60 hover:opacity-100"}`}>
                {m.emoji}
              </button>
            ))}
          </div>
          {mood && <span className="text-[11px] text-[#C4783A]">{MOODS.find(m => m.label === mood)?.hint}</span>}
        </div>

        {/* 保存全部 + 停止按钮行 */}
        <div className="flex justify-between items-center">
          <div>
            {/* 2. 停止按钮 */}
            {streaming && (
              <button type="button" onClick={stopStreaming}
                className="text-[12px] px-4 py-1 rounded-full border border-[#E4D4C0] bg-white text-[#8B6B4A] hover:border-[#C4783A] hover:text-[#C4783A] transition-colors">
                ⏹ 停止
              </button>
            )}
          </div>
          {messages.length > 0 && (
            <div className="flex gap-2">
              <button type="button" onClick={exportPDF}
                className="text-[12px] px-4 py-1 rounded-full border border-[#E4D4C0] bg-white text-[#8B6B4A] hover:border-[#3A7BC4] hover:text-[#3A7BC4] transition-colors">
                📄 导出 PDF
              </button>
              <button type="button" onClick={saveAll} disabled={saving || savedAll}
                className="text-[12px] px-4 py-1 rounded-full border border-[#E4D4C0] bg-white text-[#8B6B4A] hover:border-[#C4783A] hover:text-[#C4783A] transition-colors disabled:opacity-50">
                {savedAll ? "✓ 已保存到 Notion" : saving ? "保存中..." : "📋 保存全部到 Notion"}
              </button>
            </div>
          )}
        </div>

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
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
            }}
            disabled={streaming}
          />
          <button type="button" onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="w-[42px] h-[42px] rounded-xl border-none bg-[#C4783A] text-white text-[18px] flex-shrink-0 hover:bg-[#A85E28] disabled:bg-[#EDD4BC] disabled:cursor-not-allowed transition-colors flex items-center justify-center">
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
