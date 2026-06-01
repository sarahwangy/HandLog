// ── T-206：UI 字段 ↔ Notion 属性名映射 ─────────────
//
// 用户的 Notion 数据库列名可能是中文（"简短日常"）也可能是英文，
// 这里定义默认映射，用户可以在 Settings 里自定义覆盖
// 映射存在 KV 里：notion_schema:{userId}

// 主日记数据库的字段映射
export interface JournalFieldMapping {
  name: string;          // 日期标题，如 "5-25"
  dailySummary: string;  // 简短日常
  labels: string;        // label 标签（multi-select）
  score: string;         // 打分（number）
  insight: string;       // 一句话感悟
  review: string;        // 复盘段落
  nextSteps: string;     // 下一步
  handlogImage: string;  // 手绘复盘图（files）
  psychNote: string;     // 心理学正能量话
}

// 子数据库字段映射
export interface SubDatabaseMapping {
  personCards?: string;      // 朋友/社交圈数据库 ID
  parenting?: string;        // 育儿成长时间轴数据库 ID
  health?: string;           // 健康/身体变化数据库 ID
  finance?: string;          // 理财相关数据库 ID
  blogger?: string;          // 博主/podcast-ToDo 数据库 ID
  weeklySummary?: string;    // 复盘-汇总数据库 ID
}

// 用户完整的 Notion 配置（存在 KV 里）
export interface NotionUserSchema {
  mainDatabaseId: string;           // 主日记数据库 ID
  fieldMapping: JournalFieldMapping; // 字段名映射
  subDatabases: SubDatabaseMapping;  // 子数据库映射
}

// 默认字段名（按 PRD 中用户现有 Notion 数据库的列名）
export const DEFAULT_FIELD_MAPPING: JournalFieldMapping = {
  name: "Name",
  dailySummary: "简短日常",
  labels: "label标签",
  score: "打分",
  insight: "一句话感悟",
  review: "复盘",
  nextSteps: "下一步",
  handlogImage: "手绘复盘图",
  psychNote: "心理学正能量话",
};

// ── 把 UI 数据转成 Notion API 能接受的属性格式 ────────
// Notion API 的属性格式比较复杂（每种类型结构不同），这里统一封装

export function buildNotionProperties(
  data: {
    name: string;
    dailySummary?: string;
    labels?: string[];
    score?: number;
    insight?: string;
    review?: string;
    nextSteps?: string;
    psychNote?: string;
  },
  mapping: JournalFieldMapping
): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Title 类型：Notion 每个数据库必须有一个 title 字段
  props[mapping.name] = {
    title: [{ text: { content: data.name } }],
  };

  if (data.dailySummary) {
    props[mapping.dailySummary] = {
      rich_text: [{ text: { content: data.dailySummary } }],
    };
  }

  if (data.labels?.length) {
    // Multi-select：传入标签名数组
    props[mapping.labels] = {
      multi_select: data.labels.map((name) => ({ name })),
    };
  }

  if (data.score !== undefined) {
    props[mapping.score] = { number: data.score };
  }

  if (data.insight) {
    props[mapping.insight] = {
      rich_text: [{ text: { content: data.insight } }],
    };
  }

  if (data.review) {
    props[mapping.review] = {
      rich_text: [{ text: { content: data.review } }],
    };
  }

  if (data.nextSteps) {
    props[mapping.nextSteps] = {
      rich_text: [{ text: { content: data.nextSteps } }],
    };
  }

  if (data.psychNote) {
    props[mapping.psychNote] = {
      rich_text: [{ text: { content: data.psychNote } }],
    };
  }

  return props;
}

// ── Notion 特殊页面名称（集中管理，修改 Notion 只需改这里）──────────────────
export const NOTION_PAGE_NAMES = {
  deepChat: "Deep Chat-相关",   // 聊天记录保存页
  monthlySummary: "复盘-汇总",  // 月复盘保存页
} as const;
