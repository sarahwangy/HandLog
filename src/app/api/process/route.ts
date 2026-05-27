import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { getDraft } from "@/lib/kv";
import { generateDailyReview } from "@/lib/claude";
import { findOrCreateWeekPage, appendDailySummary, appendReviewBlocks } from "@/lib/notion";

// POST /api/process
// Body: { date: "2026-05-26" }
// Returns: DailyReview JSON
export async function POST(req: NextRequest) {
  // Allow unauthenticated in development for easier testing
  let userId = "dev-user";
  if (process.env.NODE_ENV !== "development") {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = session.userId;
  }

  const { date, journal: inlineJournal } = await req.json();
  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  // 优先用客户端传来的文字；本地没有 KV 时跳过草稿读取
  let journal = inlineJournal as string | undefined;
  if (!journal?.trim()) {
    try {
      journal = await getDraft(userId, date) ?? "";
    } catch {
      journal = "";
    }
  }
  if (!journal?.trim()) {
    return NextResponse.json({ error: "No journal content found" }, { status: 400 });
  }

  try {
    const review = await generateDailyReview(journal, date);

    // 写入 Notion：找到/创建本周页面，追加简短日常 + 复盘 Toggle
    try {
      const token = getNotionTokenInternal();
      const databaseId = getNotionDatabaseId();
      const pageId = await findOrCreateWeekPage(token, databaseId, date);
      await appendDailySummary(token, pageId, date, journal);
      await appendReviewBlocks(token, pageId, date, {
        oneLineInsight: review.oneLineInsight ?? "",
        reviewParagraph: review.reviewParagraph ?? "",
        nextSteps: review.nextSteps ?? [],
        psychNote: review.psychNote ?? "",
        score: review.score ?? 0,
      });
    } catch (notionErr) {
      console.error("Notion write failed:", notionErr);
    }

    return NextResponse.json(review);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
