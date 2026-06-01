// POST /api/chat
// Body: { messages: {role, content}[], weeks: WeekContext[] }
// 返回: text/event-stream 流式响应

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { WeekContext } from "@/app/api/chat/context/route";

// 把所有周数据拼成系统 prompt
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
- 中文回答，语气口语化
- 如果日记里没有相关信息，直接说"你的日记里没有提到这方面"`;
}

export async function POST(req: NextRequest) {
  const { messages, weeks } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    weeks: WeekContext[];
  };

  if (!messages?.length || !weeks?.length) {
    return new Response("Missing messages or weeks", { status: 400 });
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt = buildSystemPrompt(weeks);

  let stream: Awaited<ReturnType<typeof client.messages.stream>>;
  try {
    stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(msg, { status: 500 });
  }

  // 用 ReadableStream 把 Anthropic 的流转成 HTTP stream
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
