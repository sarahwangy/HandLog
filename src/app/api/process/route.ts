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

  const { date } = await req.json();
  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  // Read draft from KV (falls back to empty string if not saved yet)
  const journal = await getDraft(userId, date) ?? "";
  if (!journal.trim()) {
    return NextResponse.json({ error: "No journal content found" }, { status: 400 });
  }

  const review = await generateDailyReview(journal, date);
  return NextResponse.json(review);
}
