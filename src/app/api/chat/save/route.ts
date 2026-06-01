// POST /api/chat/save
// Body: { messages, saveAll, topic }
// 把对话写入 Notion「Deep Chat-相关」页面，使用 toggle 折叠块

import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { findDeepChatPage } from "@/lib/notion";
import { Client } from "@notionhq/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  saved?: boolean;
}

// 把一条消息转成单个 callout block
// ## 标题转成行内大写文字（callout 不支持嵌套 heading）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function messageToCallout(role: "user" | "assistant", content: string): any {
  const clean = content
    .replace(/^#{1,3}\s+(.+)/gm, "▌ $1")   // ## 标题 → ▌ 标题
    .replace(/\*\*(.+?)\*\*/g, "$1")         // **粗体** → 纯文本
    .replace(/^-{3,}$/gm, "──────")          // --- → 分割线字符
    .trim();

  return {
    type: "callout",
    callout: {
      rich_text: [{ type: "text", text: { content: clean } }],
      icon: { type: "emoji", emoji: role === "user" ? "🙋" : "🤖" },
      color: role === "user" ? "default" : "gray_background",
    },
  };
}

export async function POST(req: NextRequest) {
  const { messages, saveAll, topic } = await req.json() as {
    messages: ChatMessage[];
    saveAll: boolean;
    topic?: string;
  };

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();
    const pageId = await findDeepChatPage(token, databaseId);

    const notion = new Client({ auth: token });

    const toSave = saveAll ? messages : messages.filter((m) => m.saved);
    if (toSave.length === 0) {
      return NextResponse.json({ success: true, saved: 0 });
    }

    const now = new Date().toLocaleString("zh-CN", { timeZone: "Australia/Melbourne" });
    const label = saveAll ? "全部对话" : "片段对话";
    const titleText = topic
      ? `💬 ${label} · ${now} — ${topic}`
      : `💬 ${label} · ${now}`;

    // 每条消息 → 一个 callout block
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = toSave.map((m) => messageToCallout(m.role, m.content));

    // 用 toggle 包裹
    const toggleBlock: Parameters<typeof notion.blocks.children.append>[0]["children"] = [
      {
        type: "toggle",
        toggle: {
          rich_text: [{ type: "text", text: { content: titleText } }],
          color: "default",
          children,
        },
      } as Parameters<typeof notion.blocks.children.append>[0]["children"][number],
    ];

    await notion.blocks.children.append({
      block_id: pageId,
      children: toggleBlock,
    });

    return NextResponse.json({ success: true, saved: toSave.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
