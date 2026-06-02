import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal } from "@/lib/auth";
import { appendTableToggle } from "@/lib/notion";

// POST /api/table/weekly/save
// Body: { markdownTable: string, weekPageId: string }
// 把 markdown 表格以 Toggle > Callout 格式写入周页面 body
export async function POST(req: NextRequest) {
  const { markdownTable, weekPageId } = await req.json() as {
    markdownTable: string;
    weekPageId: string;
  };
  if (!markdownTable || !weekPageId) {
    return NextResponse.json({ error: "Missing markdownTable or weekPageId" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    await appendTableToggle(token, weekPageId, markdownTable, "📅 一周大事记");
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
