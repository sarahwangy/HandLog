import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { generateWeeklyReview } from "@/lib/claude";
import { findOrCreateWeekPage, getPage } from "@/lib/notion";

// POST /api/review/weekly
// Body: { weekLabel: "5-25-31" }
// 读取本周页面的原始「简短日常」，生成周复盘 JSON（不自动写入 Notion，由前端 Save 按钮触发保存）
export async function POST(req: NextRequest) {
  const { weekLabel } = await req.json() as { weekLabel: string };
  if (!weekLabel) {
    return NextResponse.json({ error: "Missing weekLabel" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 1. 找到本周的周页面（标题格式 "5-25-31"）
    const parts = weekLabel.split("-");
    const dateForLookup = `2026-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    const weekPageId = await findOrCreateWeekPage(token, databaseId, dateForLookup);

    // 2. 读取周页面属性：简短日常（全周 "一. 二. 三." 原始文字）和打分
    const page = await getPage(token, weekPageId) as {
      properties: Record<string, {
        title?: { plain_text: string }[];
        rich_text?: { plain_text: string }[];
        number?: number | null;
      }>;
    };
    const props = page.properties;
    const dailySummary = props["简短日常"]?.rich_text?.[0]?.plain_text ?? "";
    const score = props["打分"]?.number ?? null;

    if (!dailySummary.trim()) {
      return NextResponse.json({ error: "本周还没有日记内容，请先写日记再生成周复盘" }, { status: 404 });
    }

    // 3. 把周页面原始简短日常传给 Claude 生成周复盘（完整 22 个 section）
    const rawEntries = [{ date: weekLabel, dailySummary, score }];
    const review = await generateWeeklyReview(weekLabel, rawEntries);

    // 返回复盘数据 + weekPageId（供 Save 按钮用）
    return NextResponse.json({ ...review, weekPageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
