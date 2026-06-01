// POST /api/chat/save
// Body: { messages: {role, content, saved?: boolean}[], saveAll: boolean }
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

// 去掉 markdown 符号，保留纯文本（Notion 不渲染 markdown）
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,3}\s+/gm, "")   // ## 标题
    .replace(/\*\*(.+?)\*\*/g, "$1") // **粗体**
    .replace(/^-{3,}$/gm, "──────") // --- 分割线
    .trim();
}

export async function POST(req: NextRequest) {
  const { messages, saveAll } = await req.json() as {
    messages: ChatMessage[];
    saveAll: boolean;
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

    // 每条消息变成一个 paragraph child（放在 toggle 里）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = toSave.map((m) => ({
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: m.role === "user"
                ? `🙋 ${stripMarkdown(m.content)}`
                : `🤖 ${stripMarkdown(m.content)}`,
            },
          },
        ],
        color: m.role === "user" ? "default" : "gray_background",
      },
    }));

    // 用一个 toggle block 包裹整段对话，标题注明是全部还是片段
    const toggleBlock: Parameters<typeof notion.blocks.children.append>[0]["children"] = [
      {
        type: "toggle",
        toggle: {
          rich_text: [
            {
              type: "text",
              text: { content: `💬 ${label} · ${now}` },
            },
          ],
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
