// 服务端工具：从 Notion 拉取所有周的日记背景数据
// 供 /api/chat/context 和 /api/chat 共用

import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { queryDatabase } from "@/lib/notion";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface WeekContext {
  weekLabel: string;    // "5-25-31"
  dailySummary: string; // 简短日常全文
  labels: string[];     // 标签数组
}

export async function fetchWeekContexts(): Promise<WeekContext[]> {
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

    if (!/^\d{1,2}-\d{1,2}-\d{1,2}$/.test(weekLabel)) continue;

    const summaryProp = props["简短日常"] as { rich_text?: { plain_text: string }[] } | undefined;
    const dailySummary = summaryProp?.rich_text?.[0]?.plain_text ?? "";

    const labelProp = props["label标签"] as { multi_select?: { name: string }[] } | undefined;
    const labels = labelProp?.multi_select?.map((t) => t.name) ?? [];

    if (!dailySummary.trim()) continue;

    weeks.push({ weekLabel, dailySummary, labels });
  }

  return weeks;
}
