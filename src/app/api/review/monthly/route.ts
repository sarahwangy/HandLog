import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { generateMonthlyReview } from "@/lib/claude";
import {
  queryDatabase,
  findMonthSummaryPage,
  appendMonthlyReviewBlocks,
  appendImageBlock,
} from "@/lib/notion";

// POST /api/review/monthly
// Body: { year: 2026, month: 5 }
// Reads all week pages for the month, generates monthly review, writes to 复盘-汇总
export async function POST(req: NextRequest) {
  const { year, month } = await req.json() as { year: number; month: number };
  if (!year || !month) {
    return NextResponse.json({ error: "Missing year or month" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 1. Query all week pages for this month (titles like "5-1-7", "5-8-14", etc.)
    const allPages = await queryDatabase(token, {
      database_id: databaseId,
      filter: {
        property: "Name",
        title: { starts_with: `${month}-` },
      },
      sorts: [{ property: "Name", direction: "ascending" }],
    }) as { results: Array<{ id: string; properties: Record<string, unknown> }> };

    // Filter to pages that look like week pages (format: "5-25-31", 3 dash-separated parts)
    const weekPages = allPages.results.filter(p => {
      const props = p.properties as Record<string, { title?: { plain_text: string }[] }>;
      const name = props["Name"]?.title?.[0]?.plain_text ?? "";
      return name.split("-").length === 3;
    });

    if (weekPages.length === 0) {
      return NextResponse.json({ error: `No week pages found for ${year}-${month}` }, { status: 404 });
    }

    // 2. Build minimal WeeklyReview objects from week page properties
    const weeklyInputs = weekPages.map(p => {
      const props = p.properties as Record<string, {
        title?: { plain_text: string }[];
        rich_text?: { plain_text: string }[];
      }>;
      const weekLabel = props["Name"]?.title?.[0]?.plain_text ?? "";
      return {
        weekLabel,
        oneLineInsight: props["一句话感悟"]?.rich_text?.[0]?.plain_text ?? "",
        oneLineInsightZh: "",
        reviewParagraph: props["复盘"]?.rich_text?.[0]?.plain_text ?? "",
        score: 5, scoreReason: "", people: [], places: [], events: [], books: [],
        mediaConsumed: [], moviesTV: [], parenting: [], health: [], finance: [],
        learning: [], creativeOutput: [], emotions: [], nextSteps: [],
        energyDistribution: {}, psychNote: "",
        progressZones: { breakthrough: null, inPractice: null, plantedSeed: null },
        scoreTrend: [], emotionPattern: "", coreProblem: "", crossWeekFlag: null,
      };
    });

    // 3. Build date range and month label strings
    const lastDay = new Date(year, month, 0).getDate();
    const dateRange = `${month}月1日-${month}月${lastDay}日`;
    const monthLabel = `${year}年${month}月`;

    // 4. Generate monthly review via Claude
    const review = await generateMonthlyReview(monthLabel, dateRange, weeklyInputs);

    // 5. Find 复盘-汇总 page and write review
    const summaryPageId = await findMonthSummaryPage(token, databaseId);
    if (!summaryPageId) {
      return NextResponse.json({ error: "复盘-汇总 page not found in Notion database" }, { status: 404 });
    }

    const calloutId = await appendMonthlyReviewBlocks(token, summaryPageId, review);

    // 6. Generate AI image and store inside the monthly toggle callout
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

    return NextResponse.json({ ...review, calloutId, imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
