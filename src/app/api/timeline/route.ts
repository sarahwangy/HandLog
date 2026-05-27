import { NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { queryDatabase } from "@/lib/notion";
import { expandToDayEntries } from "@/lib/timeline";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

// GET /api/timeline
// 返回所有周记录按天展开的日记条目
export async function GET() {
  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 读取数据库里所有页面（最多 100 条周记录）
    const res = await queryDatabase(token, {
      database_id: databaseId,
      sorts: [{ property: "Name", direction: "descending" }],
      page_size: 100,
    });

    const pages = res.results.filter(
      (p): p is PageObjectResponse => p.object === "page"
    );

    const entries = expandToDayEntries(pages);
    return NextResponse.json({ entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
