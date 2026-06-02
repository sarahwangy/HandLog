import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

export interface DueDate {
  date: string;       // YYYY-MM-DD
  title: string;
  note: string | null;
}

// Daily review JSON structure returned by Claude
export interface DailyReview {
  date: string;
  oneLineInsight: string;
  oneLineInsightZh: string;
  people: string[];
  places: string[];
  events: { category: string; items: string[] }[];
  books: string[];
  mediaConsumed: string[];
  moviesTV: string[];
  parenting: string[];
  health: string[];
  finance: string[];
  learning: string[];
  creativeOutput: string[];
  emotions: string[];
  reviewParagraph: string;
  nextSteps: string[];
  energyDistribution: Record<string, number>;
  progressZones: {
    breakthrough: string | null;
    inPractice: string | null;
    plantedSeed: string | null;
  };
  score: number;
  scoreReason: string;
  psychNote: string;
  dueDates: DueDate[];
}

export interface WeeklyReview {
  weekLabel: string;
  oneLineInsight: string;
  oneLineInsightZh: string;
  people: string[];
  places: string[];
  events: { category: string; items: string[] }[];
  books: string[];
  mediaConsumed: string[];
  moviesTV: string[];
  parenting: string[];
  health: string[];
  finance: string[];
  learning: string[];
  creativeOutput: string[];
  emotions: string[];
  reviewParagraph: string;
  nextSteps: string[];
  energyDistribution: Record<string, number>;
  progressZones: {
    breakthrough: string | null;
    inPractice: string | null;
    plantedSeed: string | null;
  };
  score: number;
  scoreReason: string;
  psychNote: string;
  scoreTrend: (number | null)[];
  emotionPattern: string;
  coreProblem: string;
  crossWeekFlag: string | null;
  dueDates: DueDate[];
}

export interface MonthlyReview extends WeeklyReview {
  monthLabel: string;
  dateRange: string;
  monthlyPattern: string;
  nextMonthDirection: string[];
}

// Replace curly quotes and unescaped control chars so JSON.parse succeeds.
function sanitizeJson(text: string): string {
  const DQUOTE = 34;
  const SQUOTE = 39;
  const BACKSLASH = 92;
  const NL = 10, CR = 13, TAB = 9;
  const dq = String.fromCharCode(DQUOTE);
  const sq = String.fromCharCode(SQUOTE);
  const bs = String.fromCharCode(BACKSLASH);
  const escaped_n = bs + String.fromCharCode(110);
  const escaped_r = bs + String.fromCharCode(114);
  const escaped_t = bs + String.fromCharCode(116);

  let out = ``;
  let inStr = false, esc = false;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    if (esc) { esc = false; out += text[i]; continue; }
    if (code === BACKSLASH && inStr) { esc = true; out += text[i]; continue; }

    // 弯引号 "" 可能被 Claude 当 JSON 引号用 → 替换成直引号并追踪字符串状态
    if (code === 0x201C || code === 0x201D || code === 0x201E || code === 0x201F) {
      out += dq;
      inStr = !inStr;
      continue;
    }
    // 中文书名号「」是正文内容（不是 JSON 引号），保留原字符
    if (code === 0x300C || code === 0x300D) {
      out += text[i];
      continue;
    }

    if (code >= 0x2018 && code <= 0x201B) { out += sq; continue; }

    if (code === DQUOTE) { inStr = !inStr; out += text[i]; continue; }

    if (inStr && code === NL)  { out += escaped_n; continue; }
    if (inStr && code === CR)  { out += escaped_r; continue; }
    if (inStr && code === TAB) { out += escaped_t; continue; }

    out += text[i];
  }
  return out;
}

// 从 Claude 的响应里提取 JSON 对象，忽略前后多余的文字或 markdown 代码块
function extractJson(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response");

  // 用括号计数法找到真正匹配的根级闭合括号，而不是 lastIndexOf
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("JSON object not properly closed (truncated response)");
}

// Load prompt template from file and substitute placeholders
function buildPrompt(journal: string, date: string): string {
  const templatePath = join(process.cwd(), "src/prompts/daily-review.md");
  const template = readFileSync(templatePath, "utf-8");
  return template
    .replace("{{DATE}}", date)
    .replace("{{JOURNAL}}", journal);
}

export async function generateDailyReview(
  journal: string,
  date: string,
  apiKey?: string  // Plan B: user's own key; falls back to env var
): Promise<DailyReview> {
  const client = new Anthropic({
    apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
  });

  const prompt = buildPrompt(journal, date);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  // Extract text content from response
  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    return JSON.parse(sanitizeJson(extractJson(content.text))) as DailyReview;
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${content.text.slice(0, 500)}`);
  }
}

// 每天原始日记条目，用于周/月复盘的输入
export interface RawDailyEntry {
  date: string;          // e.g. "5-25"
  dailySummary: string;  // 原始简短日常文字
  score: number | null;  // 打分（可能为空）
}

export async function generateWeeklyReview(
  weekLabel: string,
  dailyEntries: RawDailyEntry[],
  apiKey?: string
): Promise<WeeklyReview> {
  const client = new Anthropic({
    apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
  });

  const templatePath = join(process.cwd(), "src/prompts/weekly-review.md");
  const template = readFileSync(templatePath, "utf-8");
  const prompt = template
    .replace("{{WEEK_LABEL}}", weekLabel)
    .replace("{{DAILY_ENTRIES}}", JSON.stringify(dailyEntries, null, 2));

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 12000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  try {
    return JSON.parse(sanitizeJson(extractJson(content.text))) as WeeklyReview;
  } catch {
    throw new Error(`Failed to parse weekly review JSON: ${content.text.slice(0, 500)}`);
  }
}

export async function generateMonthlyReview(
  monthLabel: string,
  dateRange: string,
  dailyEntries: RawDailyEntry[],
  apiKey?: string
): Promise<MonthlyReview> {
  const client = new Anthropic({
    apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
  });

  const templatePath = join(process.cwd(), "src/prompts/monthly-review.md");
  const template = readFileSync(templatePath, "utf-8");
  const prompt = template
    .replace("{{MONTH_LABEL}}", monthLabel)
    .replace("{{DATE_RANGE}}", dateRange)
    .replace("{{DAILY_ENTRIES}}", JSON.stringify(dailyEntries, null, 2));

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  try {
    const extracted = extractJson(content.text);
    const sanitized = sanitizeJson(extracted);
    return JSON.parse(sanitized) as MonthlyReview;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 从错误信息里提取 position，显示问题附近的字符，方便调试
    const posMatch = msg.match(/position (\d+)/);
    const pos = posMatch ? parseInt(posMatch[1]) : -1;
    const snippet = pos >= 0 ? content.text.slice(Math.max(0, pos - 30), pos + 30) : content.text.slice(0, 300);
    throw new Error(`Failed to parse monthly review JSON (${msg}) near: ...${snippet}...`);
  }
}

// ── Generate Table Bullets ─────────────────────────────────────────────────
// 输入多天日记内容，返回每天 2-4 个关键事项 bullet points
// 用 haiku 模型节省 token，单次批量处理所有天，不逐天调用

export interface DayBullets {
  date: string;      // e.g. "6-2"
  bullets: string[]; // e.g. ["完成API开发", "和老师视频通话"]
}

export async function generateTableBullets(
  entries: Array<{ date: string; dailySummary: string }>
): Promise<DayBullets[]> {
  const client = new Anthropic();

  const prompt = `你是一个日记助手。以下是用户多天的日记简短日常内容。
对每一天，提取 2-4 个最重要的事项，每个事项用简短短语（不超过 15 字）表达。

以 JSON 数组格式输出，结构如下：
[{"date": "6-2", "bullets": ["事项1", "事项2"]}]

只输出 JSON，不要任何其他文字。

日记内容：
${entries.map(e => `日期：${e.date}\n内容：${e.dailySummary}`).join("\n\n")}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "[]";
  try {
    // Claude returns a JSON array, so extract [ ... ] rather than { ... }
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    const arrayText = start !== -1 && end !== -1 ? text.slice(start, end + 1) : text;
    return JSON.parse(sanitizeJson(arrayText)) as DayBullets[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse table bullets JSON (${msg}). Raw: ${text.slice(0, 200)}`);
  }
}
