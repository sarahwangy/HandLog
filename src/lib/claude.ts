import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

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
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  // Extract text content from response
  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Strip markdown code fences if Claude wrapped the JSON
  const raw = content.text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    return JSON.parse(raw) as DailyReview;
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${raw.slice(0, 500)}`);
  }
}
