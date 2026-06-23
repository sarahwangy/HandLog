import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getNotionTokenInternal, getAuthSession } from "@/lib/auth";
import { appendImageBlock } from "@/lib/notion";
import type { DailyReview } from "@/lib/claude";

// POST /api/handlog/generate
// Body: { review: DailyReview, calloutId?: string }
// Returns: { imageUrl: string }
// 日复盘图存入当天 Toggle 的 Callout 里（block 形式）
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { review: DailyReview; calloutId?: string };
  if (!body.review) {
    return NextResponse.json({ error: "Missing review data" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey });
  const { review, calloutId } = body;

  try {
    const res = await openai.images.generate({
      model: "dall-e-3",
      prompt: buildPrompt(review),
      n: 1,
      size: "1024x1024",
      response_format: "url",
    });

    const imageUrl = res.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image URL returned");

    // 把图片追加到当天 Toggle 的 Callout 里
    if (calloutId) {
      try {
        const token = getNotionTokenInternal();
        await appendImageBlock(token, calloutId, imageUrl);
      } catch (notionErr) {
        console.error("Failed to save image to Notion:", notionErr);
      }
    }

    return NextResponse.json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildPrompt(review: DailyReview): string {
  const parts: string[] = [
    "A beautiful Japanese hobonichi techo journal spread illustration.",
    "Warm autumn palette: amber, cream, terracotta, soft brown.",
    "Handwritten-style doodles, washi tape, stamps, dried flowers.",
    "Soft watercolor textures. Cozy personal diary aesthetic.",
  ];

  if (review.oneLineInsight) {
    parts.push(`Central theme: "${review.oneLineInsight}"`);
  }
  if (review.places?.length) {
    parts.push(`Places visited: ${review.places.slice(0, 2).join(", ")}.`);
  }
  if (review.score) {
    const mood = review.score >= 8 ? "joyful and bright" : review.score >= 6 ? "calm and reflective" : "gentle and introspective";
    parts.push(`Overall mood: ${mood}.`);
  }

  parts.push("No text or words in the image. Illustration only.");
  return parts.join(" ");
}
