// GET  /api/chat/memory        → 读取「记忆本」里所有洞察，返回 { memories: string[] }
// POST /api/chat/memory        → 追加一条洞察到「记忆本」，body: { text: string }

import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { findMemoryPage, readMemoryBlocks, appendMemoryBlock } from "@/lib/notion";

export async function GET() {
  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();
    const pageId = await findMemoryPage(token, databaseId);
    const memories = await readMemoryBlocks(token, pageId);
    return NextResponse.json({ memories });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { text } = await req.json() as { text: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();
    const pageId = await findMemoryPage(token, databaseId);
    const now = new Date().toLocaleDateString("zh-CN", { timeZone: "Australia/Melbourne" });
    // toggle 标题用日期 + 首句（去掉 markdown 符号，最多 40 字）
    const firstLine = text.replace(/^#+\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1").trim().split("\n")[0].slice(0, 40);
    const toggleTitle = `${now} · ${firstLine}`;
    await appendMemoryBlock(token, pageId, toggleTitle, text.trim());
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
