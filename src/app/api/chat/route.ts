// POST /api/chat
// Body: { messages: {role, content}[] }   ← 不再包含 weeks，服务端自己拉
// 返回: 流式文本响应

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchWeekContexts, type WeekContext } from "@/lib/chat-context";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { findMemoryPage, readMemoryBlocks } from "@/lib/notion";

export const dynamic = "force-dynamic";

function buildSystemPrompt(weeks: WeekContext[], mood: string | null, memories: string[]): string {
  const entries = weeks
    .map((w) => {
      const labelStr = w.labels.length > 0 ? `标签：${w.labels.join("、")}` : "";
      return `【${w.weekLabel} 这一周】${labelStr}\n${w.dailySummary}`;
    })
    .join("\n\n");

  const moodHints: Record<string, string> = {
    "😌": "用户当前状态平静，语气平和，娓娓道来即可。",
    "😊": "用户当前状态开心，语气积极，多看亮点，给予正向回应。",
    "😔": "用户当前状态低落，语气温柔，多给鼓励和温暖。",
    "😤": "用户当前状态焦虑，语气稳定，帮她理清思路，不要给太多建议。",
    "🤔": "用户当前状态困惑，语气清晰，帮她分析情况，条理清楚。",
  };
  const moodLine = mood && moodHints[mood] ? `\n当前用户情绪提示：${moodHints[mood]}` : "";

  const memorySection = memories.length > 0
    ? `\n\n【你和用户之前聊过的洞察记录】\n${memories.map(m => `- ${m}`).join("\n")}\n请在回答时自然地参考这些洞察，不需要每次都明确提及它们。`
    : "";

  return `你是用户的日记分析助手。以下是她所有周的日记记录：

${entries}

请基于以上真实记录回答用户的问题。
规则：
- 只分析日记里真实出现的内容，不要编造
- 回答要温暖、直接、有洞察力
- 如果用户用中文问，用中文回答；如果用英文问，用英文回答
- 如果日记里没有相关信息，直接说没有提到${moodLine}${memorySection}`;
}

export async function POST(req: NextRequest) {
  let messages: { role: "user" | "assistant"; content: string }[];
  let mood: string | null = null;
  try {
    const body = await req.json();
    messages = body.messages;
    mood = body.mood ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`请求解析失败：${msg}`, { status: 400 });
  }

  if (!messages?.length) {
    return new Response("Missing messages", { status: 400 });
  }

  // 只保留 role 和 content，去掉 saved 等前端字段
  const cleanMessages = messages.map(({ role, content }) => ({ role, content }));

  let weeks: WeekContext[];
  try {
    weeks = await fetchWeekContexts();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`读取日记数据失败：${msg}`, { status: 500 });
  }

  // 读取记忆本（失败不影响对话，静默降级为空）
  let memories: string[] = [];
  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();
    const memPageId = await findMemoryPage(token, databaseId);
    memories = await readMemoryBlocks(token, memPageId);
  } catch { /* 记忆本不存在或读取失败时静默跳过 */ }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = buildSystemPrompt(weeks, mood, memories);

  let stream: Awaited<ReturnType<typeof client.messages.stream>>;
  try {
    stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: cleanMessages,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(msg, { status: 500 });
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
