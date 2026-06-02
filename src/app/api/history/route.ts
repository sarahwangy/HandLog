// GET /api/history
// 返回所有周的历史条目，供历史复盘页面展示
// 每条包含：weekLabel、score、labels、notionUrl

import { NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { queryDatabase } from "@/lib/notion";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface HistoryEntry {
  weekLabel: string;        // "5-25-31"
  score: number | null;     // 打分 1-10，可能为空
  labels: string[];         // 标签数组
  notionUrl: string;        // 指向该周 Notion 页面的链接
  hasSummary: boolean;      // 简短日常是否有内容（判断是否写过日记）
}

export async function GET() {
  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    const res = await queryDatabase(token, {
      database_id: databaseId,
      sorts: [{ property: "Name", direction: "descending" }], // 最新在前
      page_size: 100,
    });

    const pages = res.results.filter(
      (p): p is PageObjectResponse => p.object === "page"
    );

    const entries: HistoryEntry[] = [];

    for (const page of pages) {
      const props = page.properties as Record<string, unknown>;

      const titleProp = props["Name"] as { title?: { plain_text: string }[] } | undefined;
      const weekLabel = titleProp?.title?.[0]?.plain_text ?? "";

      // 只显示格式为 "M-D-D" 的周条目，跳过"复盘-汇总"等特殊行
      if (!/^\d{1,2}-\d{1,2}-\d{1,2}$/.test(weekLabel)) continue;

      const scoreProp = props["打分"] as { number?: number | null } | undefined;
      const score = scoreProp?.number ?? null;

      const labelProp = props["label标签"] as { multi_select?: { name: string }[] } | undefined;
      const labels = labelProp?.multi_select?.map((t) => t.name) ?? [];

      const summaryProp = props["简短日常"] as { rich_text?: { plain_text: string }[] } | undefined;
      const hasSummary = !!summaryProp?.rich_text?.[0]?.plain_text?.trim();

      // Notion 页面 URL：去掉 pageId 里的短横线
      const notionUrl = `https://www.notion.so/${page.id.replace(/-/g, "")}`;

      entries.push({ weekLabel, score, labels, notionUrl, hasSummary });
    }

    return NextResponse.json({ entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
