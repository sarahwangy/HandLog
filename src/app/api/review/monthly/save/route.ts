import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { findMonthSummaryPage, appendMonthlyReviewBlocks, appendImageBlock } from "@/lib/notion";
import type { MonthlyReview } from "@/lib/claude";

// POST /api/review/monthly/save
// Body: { review: MonthlyReview }
// 把已生成的月复盘写入「复盘-汇总」页面 body
export async function POST(req: NextRequest) {
  const { review } = await req.json() as { review: MonthlyReview };
  if (!review) {
    return NextResponse.json({ error: "Missing review" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 1. 找到「复盘-汇总」页面
    const summaryPageId = await findMonthSummaryPage(token, databaseId);
    if (!summaryPageId) {
      return NextResponse.json({ error: "Notion 数据库里没有找到「复盘-汇总」页面" }, { status: 404 });
    }

    // 2. 写入月复盘 blocks
    const calloutId = await appendMonthlyReviewBlocks(token, summaryPageId, review);

    // 3. 生成 AI 图片并追加到复盘 Toggle 里（失败不影响保存）
    let imageUrl: string | null = null;
    if (calloutId) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
        const imgRes = await fetch(`${baseUrl}/api/handlog/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review: { oneLineInsight: review.oneLineInsight, score: review.score, emotions: review.emotions },
            calloutId: null,
          }),
        });
        if (imgRes.ok) {
          const imgData = await imgRes.json() as { imageUrl?: string };
          imageUrl = imgData.imageUrl ?? null;
        }
      } catch { /* non-fatal */ }

      if (imageUrl) {
        await appendImageBlock(token, calloutId, imageUrl);
      }
    }

    return NextResponse.json({ success: true, calloutId, imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
