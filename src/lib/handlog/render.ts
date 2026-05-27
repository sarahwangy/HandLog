import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { DailyReview } from "@/lib/claude";
import type { HandLogStyle } from "./templates";

const WIDTH = 800;
const HEIGHT = 450;

// 字体缓存在 module scope，避免每次请求重复读取
let cachedFont: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
  if (cachedFont) return cachedFont;

  // 优先读本地文件（开发时手动放置，或首次下载后缓存）
  const localPath = join(process.cwd(), "public", "font.ttf");
  if (existsSync(localPath)) {
    const buf = readFileSync(localPath);
    cachedFont = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    return cachedFont;
  }

  // 本地不存在时从 Google Fonts 下载 Noto Sans TTF（支持中英文）
  // 首次请求约慢 1-2 秒，之后缓存在内存里
  const res = await fetch(
    "https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyetreatment.ttf"
  );
  if (!res.ok) {
    // fallback：用更简单的 Inter TTF
    const fallback = await fetch("https://rsms.me/inter/font-files/Inter-Regular.ttf");
    if (!fallback.ok) throw new Error("Failed to load font");
    cachedFont = await fallback.arrayBuffer();
  } else {
    cachedFont = await res.arrayBuffer();
  }
  return cachedFont;
}

export async function renderHandLog(
  review: DailyReview,
  style: HandLogStyle
): Promise<Buffer> {
  // 动态 import 避免在 Node.js 环境外加载 React JSX
  const { getTemplate } = await import("./templates");
  const font = await getFont();

  // Satori：把 React 元素转换成 SVG 字符串
  // 注意：Satori 不支持所有 CSS 属性，需要用 inline style + flexbox
  const svg = await satori(getTemplate({ review, style }), {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      {
        name: "serif",
        data: font,
        weight: 400,
        style: "normal",
      },
    ],
  });

  // resvg-js：把 SVG 字符串转换成 PNG Buffer
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
