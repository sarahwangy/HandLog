import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getDraft, setDraft, deleteDraft } from "@/lib/kv";

// ── GET /api/draft?date=2026-05-26 ──────────────────
// 读取指定日期的草稿
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "缺少 date 参数" }, { status: 400 });
  }

  const content = await getDraft(session.userId, date);
  return NextResponse.json({ content: content ?? "" });
}

// ── POST /api/draft ──────────────────────────────────
// 保存草稿（自动保存时调用）
// body: { date: "2026-05-26", content: "今天..." }
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const { date, content } = body;

  if (!date || content === undefined) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  // content 为空字符串时删除草稿（用户清空了输入框）
  if (content === "") {
    await deleteDraft(session.userId, date);
  } else {
    await setDraft(session.userId, date, content);
  }

  return NextResponse.json({ ok: true });
}
