import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { generateWeeklyReview } from "@/lib/claude";
import {
  findOrCreateWeekPage,
  appendWeeklyReviewBlocks,
  updateWeekPageImage,
  getPage,
} from "@/lib/notion";

// POST /api/review/weekly
// Body: { weekLabel: "5-25-31" }
// 直接读取周页面的属性（简短日常、复盘等），生成周复盘，写回 Notion
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

    // 2. 读取周页面属性：简短日常、一句话感悟、复盘、打分
    const page = await getPage(token, weekPageId) as {
      properties: Record<string, {
        title?: { plain_text: string }[];
        rich_text?: { plain_text: string }[];
        number?: number | null;
      }>;
    };
    const props = page.properties;
    const dailySummary = props["简短日常"]?.rich_text?.[0]?.plain_text ?? "";
    const insight = props["一句话感悟"]?.rich_text?.[0]?.plain_text ?? "";
    const reviewText = props["复盘"]?.rich_text?.[0]?.plain_text ?? "";
    const score = props["打分"]?.number ?? null;

    if (!dailySummary.trim()) {
      return NextResponse.json({ error: "本周还没有日记内容，请先写日记再生成周复盘" }, { status: 404 });
    }

    // 3. 把周页面内容包装成 generateWeeklyReview 需要的格式
    // 用一条记录代表整周，dailySummary 作为本周所有日记内容
    const reviewInputs = [{
      date: dateForLookup,
      oneLineInsight: insight,
      oneLineInsightZh: "",
      reviewParagraph: reviewText,
      score: score ?? 5,
      scoreReason: "",
      // 把 dailySummary 放进 learning 字段让 Claude 能读到完整内容
      people: [], places: [], events: [], books: [], mediaConsumed: [],
      moviesTV: [], parenting: [], health: [], finance: [],
      learning: [dailySummary],
      creativeOutput: [], emotions: [], nextSteps: [], psychNote: "",
      energyDistribution: {},
      progressZones: { breakthrough: null, inPractice: null, plantedSeed: null },
    }];

    // 4. Claude 生成周复盘
    const review = await generateWeeklyReview(weekLabel, reviewInputs);

    // 5. 写入 Notion 周页面 body
    const calloutId = await appendWeeklyReviewBlocks(token, weekPageId, review);

    // 6. 生成 AI 图片并存入「手绘复盘图」属性
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

    return NextResponse.json({ ...review, calloutId, imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
