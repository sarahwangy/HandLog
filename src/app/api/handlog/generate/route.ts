import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { renderHandLog } from "@/lib/handlog/render";
import type { HandLogStyle } from "@/lib/handlog/templates";
import type { DailyReview } from "@/lib/claude";

// POST /api/handlog/generate
// Body: { review: DailyReview, style: "minimal" | "cute" | "vintage" }
// Returns: PNG image (image/png)
export async function POST(req: NextRequest) {
  // 开发环境跳过鉴权，方便本地测试
  if (process.env.NODE_ENV !== "development") {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json() as { review: DailyReview; style?: HandLogStyle };
  if (!body.review) {
    return NextResponse.json({ error: "Missing review data" }, { status: 400 });
  }

  const style: HandLogStyle = body.style ?? "minimal";

  try {
    const png = await renderHandLog(body.review, style);

    // 返回 PNG 二进制，前端可以直接用 URL.createObjectURL 显示
    return new NextResponse(png.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        // 不缓存，每次都是新图片
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
