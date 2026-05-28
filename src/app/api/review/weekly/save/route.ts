import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal } from "@/lib/auth";
import { appendWeeklyReviewBlocks, updateWeekPageImage } from "@/lib/notion";
import type { WeeklyReview } from "@/lib/claude";

// POST /api/review/weekly/save
// Body: { review: WeeklyReview, weekPageId: string }
// 把已生成的周复盘写入 Notion 周页面 body
export async function POST(req: NextRequest) {
  const { review, weekPageId } = await req.json() as { review: WeeklyReview; weekPageId: string };
  if (!review || !weekPageId) {
    return NextResponse.json({ error: "Missing review or weekPageId" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();

    // 1. 写入周复盘 blocks
    const calloutId = await appendWeeklyReviewBlocks(token, weekPageId, review);

    // 2. 生成 AI 图片并存入「手绘复盘图」属性（失败不影响保存）
    let imageUrl: string | null = null;
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
    } catch { /* image failure is non-fatal */ }

    if (imageUrl) {
      await updateWeekPageImage(token, weekPageId, imageUrl);
    }

    return NextResponse.json({ success: true, calloutId, imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
