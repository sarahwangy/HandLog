// POST /api/chat
// Body: { messages: {role, content}[] }   ← 不再包含 weeks，服务端自己拉
// 返回: 流式文本响应

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchWeekContexts, type WeekContext } from "@/lib/chat-context";

export const dynamic = "force-dynamic";

function buildSystemPrompt(weeks: WeekContext[]): string {
  const entries = weeks
    .map((w) => {
      const labelStr = w.labels.length > 0 ? `标签：${w.labels.join("、")}` : "";
      return `【${w.weekLabel} 这一周】${labelStr}\n${w.dailySummary}`;
    })
    .join("\n\n");

  return `你是用户的日记分析助手。以下是她所有周的日记记录：

${entries}

请基于以上真实记录回答用户的问题。
规则：
- 只分析日记里真实出现的内容，不要编造
- 回答要温暖、直接、有洞察力
- 如果用户用中文问，用中文回答；如果用英文问，用英文回答
- 如果日记里没有相关信息，直接说没有提到`;
}

export async function POST(req: NextRequest) {
  let messages: { role: "user" | "assistant"; content: string }[];
  try {
    const body = await req.json();
    messages = body.messages;
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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = buildSystemPrompt(weeks);

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
