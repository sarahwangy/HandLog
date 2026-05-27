// Dashboard 数据转换工具
// 把从 Notion 拿到的原始页面列表，转成图表需要的格式

export interface DashboardEntry {
  date: string;        // "2026-05-26"
  score: number;       // 1-10
  labels: string[];    // multi-select 标签
  insight: string;     // 一句话感悟
}

export interface DashboardData {
  entries: DashboardEntry[];
  scoreTrend: { date: string; score: number }[];
  labelFrequency: { label: string; count: number }[];
  avgScore: number;
  totalEntries: number;
  currentStreak: number;   // 连续写日记天数
}

// 从 Notion API 返回的页面列表提取 Dashboard 数据
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformNotionPages(pages: any[], fieldMapping: {
  name: string;
  score: string;
  labels: string;
  insight: string;
}): DashboardData {
  const entries: DashboardEntry[] = [];

  for (const page of pages) {
    const props = page.properties;

    // 提取日期：从 title 字段（格式如 "5-25" 或 "2026-05-25"）
    const titleArr = props[fieldMapping.name]?.title;
    const rawName: string = titleArr?.[0]?.plain_text ?? "";

    // 提取分数
    const score: number = props[fieldMapping.score]?.number ?? 0;
    if (!score) continue; // 没有分数的条目跳过

    // 提取标签
    const labelArr = props[fieldMapping.labels]?.multi_select ?? [];
    const labels: string[] = labelArr.map((l: { name: string }) => l.name);

    // 提取感悟
    const insightArr = props[fieldMapping.insight]?.rich_text ?? [];
    const insight: string = insightArr[0]?.plain_text ?? "";

    // 从标题解析日期，格式如 "5-4-10" → 2026-05-04
    // 标题不符合格式（如"4月"月复盘页）直接跳过
    const date = parseTitleDate(rawName);
    if (!date) continue;

    entries.push({ date, score, labels, insight });
  }

  // 按日期升序排列
  entries.sort((a, b) => a.date.localeCompare(b.date));

  // 分数趋势：最近 30 条
  const scoreTrend = entries.slice(-30).map(e => ({ date: e.date, score: e.score }));

  // 标签频率统计
  const labelMap: Record<string, number> = {};
  for (const e of entries) {
    for (const l of e.labels) {
      labelMap[l] = (labelMap[l] ?? 0) + 1;
    }
  }
  const labelFrequency = Object.entries(labelMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // 最多显示 8 个标签

  // 平均分
  const avgScore = entries.length
    ? Math.round((entries.reduce((s, e) => s + e.score, 0) / entries.length) * 10) / 10
    : 0;

  // 连续写日记天数
  const streak = calcStreak(entries.map(e => e.date));

  return {
    entries,
    scoreTrend,
    labelFrequency,
    avgScore,
    totalEntries: entries.length,
    currentStreak: streak,
  };
}

// 从标题解析周开始日期
// "5-4-10" → "2026-05-04"，"4-28-5-4" → "2026-04-28"
function parseTitleDate(title: string): string | null {
  const parts = title.trim().split("-");
  if (parts.length < 2) return null;
  const month = parseInt(parts[0]);
  const day = parseInt(parts[1]);
  if (isNaN(month) || isNaN(day)) return null;
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// 计算连续写日记的周数（每条记录代表一周，按7天间隔往前数）
function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a)); // 降序
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    // 两条记录间隔在 5-9 天内，认为是连续的两周
    if (diffDays >= 5 && diffDays <= 9) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
