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

// 从 Claude 的响应里提取 JSON 对象，忽略前后多余的文字或 markdown 代码块
function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return text.slice(start, end + 1);
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
    return JSON.parse(extractJson(content.text)) as DailyReview;
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${content.text.slice(0, 500)}`);
  }
}

export async function generateWeeklyReview(
  weekLabel: string,
  dailyEntries: DailyReview[],
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
    return JSON.parse(extractJson(content.text)) as WeeklyReview;
  } catch {
    throw new Error(`Failed to parse weekly review JSON: ${content.text.slice(0, 500)}`);
  }
}

export async function generateMonthlyReview(
  monthLabel: string,
  dateRange: string,
  weeklyEntries: WeeklyReview[],
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
    .replace("{{WEEKLY_ENTRIES}}", JSON.stringify(weeklyEntries, null, 2));

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  try {
    return JSON.parse(extractJson(content.text)) as MonthlyReview;
  } catch {
    throw new Error(`Failed to parse monthly review JSON: ${content.text.slice(0, 500)}`);
  }
}
