import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getDraft } from "@/lib/kv";
import { generateDailyReview } from "@/lib/claude";

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

  // Accept inline journal text (from client) OR read from KV
  let journal = inlineJournal as string | undefined;
  if (!journal?.trim()) {
    journal = await getDraft(userId, date) ?? "";
  }
  if (!journal.trim()) {
    return NextResponse.json({ error: "No journal content found" }, { status: 400 });
  }

  try {
    const review = await generateDailyReview(journal, date);
    return NextResponse.json(review);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
