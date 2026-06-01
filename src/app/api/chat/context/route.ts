// GET /api/chat/context
// 返回所有周的「简短日常」和「标签」，供 Chat 页面作为 AI 背景数据

import { NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { queryDatabase } from "@/lib/notion";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface WeekContext {
  weekLabel: string;    // "5-25-31"
  dailySummary: string; // 简短日常全文
  labels: string[];     // 标签数组
}

export async function GET() {
  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    const res = await queryDatabase(token, {
      database_id: databaseId,
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
    });

    const pages = res.results.filter(
      (p): p is PageObjectResponse => p.object === "page"
    );

    const weeks: WeekContext[] = [];

    for (const page of pages) {
      const props = page.properties as Record<string, unknown>;

      const titleProp = props["Name"] as { title?: { plain_text: string }[] } | undefined;
      const weekLabel = titleProp?.title?.[0]?.plain_text ?? "";

      // 只处理格式为 "月-起日-止日" 的周记录，跳过月汇总等页面
      if (!/^\d{1,2}-\d{1,2}-\d{1,2}$/.test(weekLabel)) continue;

      const summaryProp = props["简短日常"] as { rich_text?: { plain_text: string }[] } | undefined;
      const dailySummary = summaryProp?.rich_text?.[0]?.plain_text ?? "";

      const labelProp = props["label标签"] as { multi_select?: { name: string }[] } | undefined;
      const labels = labelProp?.multi_select?.map((t) => t.name) ?? [];

      if (!dailySummary.trim()) continue; // 跳过没有内容的周

      weeks.push({ weekLabel, dailySummary, labels });
    }

    return NextResponse.json({ weeks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
