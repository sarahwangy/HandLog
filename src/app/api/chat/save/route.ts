// POST /api/chat/save
// Body: { messages: {role, content, saved?: boolean}[], saveAll: boolean }
// 把 saved 为 true 的消息（或全部消息）写入 Notion「Deep Chat-相关」页面

import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { findDeepChatPage } from "@/lib/notion";
import { Client } from "@notionhq/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  saved?: boolean; // true = 单独点了保存的消息
}

export async function POST(req: NextRequest) {
  const { messages, saveAll } = await req.json() as {
    messages: ChatMessage[];
    saveAll: boolean; // true = 保存全部，false = 只保存 saved:true 的
  };

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();
    const pageId = await findDeepChatPage(token, databaseId);

    const notion = new Client({ auth: token });

    // 筛选要保存的消息
    const toSave = saveAll ? messages : messages.filter((m) => m.saved);
    if (toSave.length === 0) {
      return NextResponse.json({ success: true, saved: 0 });
    }

    // 转成 Notion block
    const now = new Date().toLocaleString("zh-CN", { timeZone: "Australia/Melbourne" });
    const blocks: Parameters<typeof notion.blocks.children.append>[0]["children"] = [
      {
        type: "divider",
        divider: {},
      },
      {
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: `💬 对话记录 · ${now}` } }],
          color: "gray",
        },
      },
      ...toSave.map((m) => ({
        type: "paragraph" as const,
        paragraph: {
          rich_text: [
            {
              type: "text" as const,
              text: { content: m.role === "user" ? `🙋 ${m.content}` : `🤖 ${m.content}` },
            },
          ],
          color: m.role === "user" ? ("default" as const) : ("gray_background" as const),
        },
      })),
    ];

    // 分批写入（每次最多 100 块）
    const CHUNK = 100;
    for (let i = 0; i < blocks.length; i += CHUNK) {
      await notion.blocks.children.append({
        block_id: pageId,
        children: blocks.slice(i, i + CHUNK),
      });
    }

    return NextResponse.json({ success: true, saved: toSave.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
