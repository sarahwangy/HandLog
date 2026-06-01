// GET /api/chat/context
// 返回所有周数量，供前端显示「已读取 N 周日记」

import { NextResponse } from "next/server";
import { fetchWeekContexts } from "@/lib/chat-context";

export type { WeekContext } from "@/lib/chat-context";

export async function GET() {
  try {
    const weeks = await fetchWeekContexts();
    return NextResponse.json({ count: weeks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
