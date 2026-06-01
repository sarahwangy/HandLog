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

// 用户消息 → 简单 callout
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function userCallout(content: string): any {
  return {
    type: "callout",
    callout: {
      rich_text: [{ type: "text", text: { content: content.trim() } }],
      icon: { type: "emoji", emoji: "🙋" },
      color: "default",
    },
  };
}

// AI 消息 → callout（空标题）+ children（heading_2/heading_3/paragraph）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aiCallout(content: string): any {
  const lines = content.split("\n");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [];
  const buffer: string[] = [];

  function flushBuffer() {
    const text = buffer
      .join("\n")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/^-{3,}$/gm, "──────")
      .trim();
    if (text) {
      children.push({
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content: text } }] },
      });
    }
    buffer.length = 0;
  }

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    if (h2 || h3) {
      flushBuffer();
      const t = (h2 ? h2[1] : h3![1]).replace(/\*\*(.+?)\*\*/g, "$1");
      const level = h2 ? "heading_2" : "heading_3";
      children.push({ type: level, [level]: { rich_text: [{ type: "text", text: { content: t } }] } });
    } else {
      buffer.push(line);
    }
  }
  flushBuffer();

  return {
    type: "callout",
    callout: {
      rich_text: [{ type: "text", text: { content: "" } }],
      icon: { type: "emoji", emoji: "🤖" },
      color: "gray_background",
      children,
    },
  };
}

function messageToCallout(role: "user" | "assistant", content: string) {
  return role === "user" ? userCallout(content) : aiCallout(content);
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
          color: "blue_background",
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
