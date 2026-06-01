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

// 把一条消息的文本拆成 Notion blocks（处理 ## 标题、正文段落）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function messageToBlocks(role: "user" | "assistant", content: string): any[] {
  const prefix = role === "user" ? "🙋 " : "🤖 ";
  const lines = content.split("\n");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];

  let buffer: string[] = [];

  function flushBuffer() {
    const text = buffer.join("\n").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^-{3,}$/gm, "──────").trim();
    if (text) {
      blocks.push({
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: text } }],
          color: role === "user" ? "default" : "gray_background",
        },
      });
    }
    buffer = [];
  }

  let isFirst = true;
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);

    if (h2 || h3) {
      flushBuffer();
      const headingText = (h2 ? h2[1] : h3![1]).replace(/\*\*(.+?)\*\*/g, "$1");
      blocks.push({
        type: h2 ? "heading_2" : "heading_3",
        [h2 ? "heading_2" : "heading_3"]: {
          rich_text: [{ type: "text", text: { content: headingText } }],
          color: "default",
        },
      });
    } else {
      // 第一行加上角色前缀
      if (isFirst) {
        buffer.push(prefix + line);
        isFirst = false;
      } else {
        buffer.push(line);
      }
    }
  }
  flushBuffer();

  return blocks;
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

    // 所有消息展开成 blocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = toSave.flatMap((m) => messageToBlocks(m.role, m.content));

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
