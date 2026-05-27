import type { DailyReview } from "@/lib/claude";

export type HandLogStyle = "minimal" | "cute" | "vintage";

export interface TemplateProps {
  review: DailyReview;
  style: HandLogStyle;
}

// ── 通用工具 ────────────────────────────────────────────────────────────────

function ScoreDots({ score }: { score: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: i < score ? "#C4A962" : "#E8D9C4",
          }}
        />
      ))}
    </div>
  );
}

// ── Minimal 模板 ─────────────────────────────────────────────────────────────
// 干净线条，衬线字体，奶油色背景

export function MinimalTemplate({ review }: { review: DailyReview }) {
  const topKeywords = [
    ...review.people.slice(0, 2),
    ...review.events.flatMap(g => g.items).slice(0, 2),
    ...review.learning.slice(0, 1),
  ].slice(0, 4);

  return (
    <div
      style={{
        width: 800,
        height: 450,
        background: "#FAF6F0",
        display: "flex",
        flexDirection: "column",
        padding: "48px 56px",
        fontFamily: "serif",
        position: "relative",
      }}
    >
      {/* 顶部线条 */}
      <div style={{ width: "100%", height: 2, background: "#2C1F14", marginBottom: 32 }} />

      {/* 日期 */}
      <div style={{ fontSize: 13, color: "#8B6B4A", letterSpacing: 3, marginBottom: 16, display: "flex" }}>
        {review.date.toUpperCase()}
      </div>

      {/* 一句话洞察 */}
      <div
        style={{
          fontSize: 22,
          color: "#2C1F14",
          fontStyle: "italic",
          lineHeight: 1.5,
          flex: 1,
          display: "flex",
          alignItems: "center",
          maxWidth: 600,
        }}
      >
        &ldquo;{review.oneLineInsight}&rdquo;
      </div>

      {/* 底部：关键词 + 分数 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {topKeywords.map((kw, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: "#8B6B4A",
                border: "1px solid #C4A972",
                padding: "3px 10px",
                display: "flex",
              }}
            >
              {kw}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <ScoreDots score={review.score} />
          <div style={{ fontSize: 11, color: "#8B6B4A", display: "flex" }}>HandLog · {review.score}/10</div>
        </div>
      </div>

      {/* 底部线条 */}
      <div style={{ width: "100%", height: 2, background: "#2C1F14", marginTop: 24 }} />
    </div>
  );
}

// ── Cute 模板 ────────────────────────────────────────────────────────────────
// 圆角卡片，柔和色彩，小图标

export function CuteTemplate({ review }: { review: DailyReview }) {
  // 根据最多内容的分类确定主色
  const dominantColor = review.parenting.length > 0 ? "#F9B8C8"
    : review.learning.length > 0 ? "#B8D8F9"
    : review.health.length > 0 ? "#B8F9D0"
    : "#F9DEB8";

  return (
    <div
      style={{
        width: 800,
        height: 450,
        background: dominantColor,
        display: "flex",
        flexDirection: "column",
        padding: "40px 48px",
        fontFamily: "sans-serif",
        borderRadius: 24,
      }}
    >
      {/* 顶部：emoji + 日期 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <div style={{ fontSize: 28, display: "flex" }}>✨</div>
        <div style={{ fontSize: 14, color: "#4A3728", opacity: 0.7, display: "flex" }}>{review.date}</div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 18, display: "flex" }}>⭐</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: "#4A3728", display: "flex" }}>
            {review.score}
            <span style={{ fontSize: 13, opacity: 0.6, alignSelf: "flex-end", marginBottom: 2 }}>/10</span>
          </div>
        </div>
      </div>

      {/* 洞察卡片 */}
      <div
        style={{
          background: "rgba(255,255,255,0.7)",
          borderRadius: 16,
          padding: "20px 24px",
          fontSize: 18,
          color: "#2C1F14",
          fontStyle: "italic",
          lineHeight: 1.6,
          flex: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        {review.oneLineInsight}
      </div>

      {/* 底部：Next steps 预览 + 水印 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {review.nextSteps.slice(0, 2).map((step, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.6)",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 11,
                color: "#4A3728",
                display: "flex",
              }}
            >
              ✓ {step.slice(0, 20)}{step.length > 20 ? "…" : ""}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#4A3728", opacity: 0.5, display: "flex" }}>HandLog 🌸</div>
      </div>
    </div>
  );
}

// ── Vintage 模板 ─────────────────────────────────────────────────────────────
// 做旧纸张风，装饰边框

export function VintageTemplate({ review }: { review: DailyReview }) {
  return (
    <div
      style={{
        width: 800,
        height: 450,
        background: "#F2E8D5",
        display: "flex",
        flexDirection: "column",
        padding: "40px 56px",
        fontFamily: "serif",
        position: "relative",
      }}
    >
      {/* 装饰边框 */}
      <div
        style={{
          position: "absolute",
          inset: 12,
          border: "2px solid #A08060",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 18,
          border: "1px solid #C4A972",
          display: "flex",
        }}
      />

      {/* 标题区 */}
      <div style={{ textAlign: "center", marginBottom: 28, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 5, color: "#8B6B4A", display: "flex" }}>
          ✦ HANDLOG ✦
        </div>
        <div style={{ fontSize: 24, color: "#2C1F14", marginTop: 8, display: "flex" }}>
          Daily Record
        </div>
        <div style={{ fontSize: 12, color: "#8B6B4A", marginTop: 4, letterSpacing: 2, display: "flex" }}>
          {review.date}
        </div>
        <div style={{ width: 120, height: 1, background: "#C4A972", marginTop: 12, display: "flex" }} />
      </div>

      {/* 主文字 */}
      <div
        style={{
          flex: 1,
          fontSize: 18,
          color: "#2C1F14",
          fontStyle: "italic",
          lineHeight: 1.8,
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        &ldquo;{review.oneLineInsight}&rdquo;
      </div>

      {/* 分隔线 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: "#C4A972", display: "flex" }} />
        <div style={{ fontSize: 12, color: "#8B6B4A", display: "flex" }}>✦</div>
        <div style={{ flex: 1, height: 1, background: "#C4A972", display: "flex" }} />
      </div>

      {/* 底部：分数 + 关键词 */}
      <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <ScoreDots score={review.score} />
          <div style={{ fontSize: 10, color: "#8B6B4A", letterSpacing: 1, display: "flex" }}>
            SCORE {review.score}/10
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 导出统一入口 ─────────────────────────────────────────────────────────────

export function getTemplate(props: TemplateProps) {
  switch (props.style) {
    case "cute": return <CuteTemplate review={props.review} />;
    case "vintage": return <VintageTemplate review={props.review} />;
    default: return <MinimalTemplate review={props.review} />;
  }
}
