import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { generateWeeklyReview } from "@/lib/claude";
import {
  findOrCreateWeekPage,
  getWeekDailyEntries,
  appendWeeklyReviewBlocks,
  updateWeekPageImage,
} from "@/lib/notion";

// POST /api/review/weekly
// Body: { weekLabel: "5-25-31" }
// Reads daily entries for the week, generates weekly review, writes to Notion
export async function POST(req: NextRequest) {
  const { weekLabel } = await req.json() as { weekLabel: string };
  if (!weekLabel) {
    return NextResponse.json({ error: "Missing weekLabel" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 1. Read all daily entries for this week from Notion
    const dailyEntries = await getWeekDailyEntries(token, databaseId, weekLabel);
    if (dailyEntries.length === 0) {
      return NextResponse.json({ error: "No daily entries found for this week" }, { status: 404 });
    }

    // 2. Build minimal DailyReview-shaped objects from Notion properties
    const reviewInputs = dailyEntries.map(e => ({
      date: e.date,
      oneLineInsight: e.insight,
      oneLineInsightZh: "",
      reviewParagraph: e.review,
      score: e.score ?? 5,
      scoreReason: "",
      people: [], places: [], events: [], books: [], mediaConsumed: [],
      moviesTV: [], parenting: [], health: [], finance: [], learning: [],
      creativeOutput: [], emotions: [], nextSteps: [], psychNote: "",
      energyDistribution: {},
      progressZones: { breakthrough: null, inPractice: null, plantedSeed: null },
    }));

    // 3. Generate weekly review via Claude
    const review = await generateWeeklyReview(weekLabel, reviewInputs);

    // 4. Write review to Notion week page body
    // weekLabel "5-25-31" → date "2026-05-25" for findOrCreateWeekPage
    const parts = weekLabel.split("-");
    const dateForLookup = `2026-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    const weekPageId = await findOrCreateWeekPage(token, databaseId, dateForLookup);
    const calloutId = await appendWeeklyReviewBlocks(token, weekPageId, review);

    // 5. Generate AI image and store in 手绘复盘图 property
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
    } catch { /* image generation failure is non-fatal */ }

    if (imageUrl) {
      await updateWeekPageImage(token, weekPageId, imageUrl);
    }

    return NextResponse.json({ ...review, calloutId, imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
