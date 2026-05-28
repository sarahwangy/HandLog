"use client";

import { useState, useEffect } from "react";
import type { DailyReview, WeeklyReview, MonthlyReview } from "@/lib/claude";

interface ReviewContentProps {
  dateKey: string;
}

export default function ReviewContent({ dateKey }: ReviewContentProps) {
  const [review, setReview] = useState<DailyReview | null>(null);
  const [calloutId, setCalloutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [weekLabel, setWeekLabel] = useState<string>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(today);
    mon.setDate(today.getDate() + diff);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return `${mon.getMonth() + 1}-${mon.getDate()}-${sun.getDate()}`;
  });
  const [weekReview, setWeekReview] = useState<WeeklyReview | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [monthReview, setMonthReview] = useState<MonthlyReview | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthError, setMonthError] = useState<string | null>(null);

  // 页面加载时先检查 sessionStorage 里有没有从 Capture 页传来的复盘结果
  useEffect(() => {
    const pending = sessionStorage.getItem("pendingReview");
    if (pending) {
      const parsed = JSON.parse(pending);
      setReview(parsed);
      if (parsed.calloutId) setCalloutId(parsed.calloutId);
      sessionStorage.removeItem("pendingReview");
    }
  }, []);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate review");
      setReview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const generateWeekly = async () => {
    setWeekLoading(true);
    setWeekError(null);
    try {
      const res = await fetch("/api/review/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setWeekReview(data);
    } catch (err) {
      setWeekError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setWeekLoading(false);
    }
  };

  const generateMonthly = async () => {
    const now = new Date();
    setMonthLoading(true);
    setMonthError(null);
    try {
      const res = await fetch("/api/review/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: now.getFullYear(), month: now.getMonth() + 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMonthReview(data);
    } catch (err) {
      setMonthError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMonthLoading(false);
    }
  };

  if (!review && activeTab === "daily") {
    return (
      <div className="space-y-3">
        {/* Tab bar */}
        <div className="flex gap-2 mb-6">
          {(["daily", "weekly", "monthly"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-[6px] rounded-full text-[13px] font-medium transition-colors ${
                activeTab === tab
                  ? "bg-[#2C1F14] text-white"
                  : "bg-white border border-[#E4D4C0] text-[#8B6B4A] hover:border-[#C4A98A]"
              }`}
            >
              {tab === "daily" ? "Daily" : tab === "weekly" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
        <div className="text-center py-24">
          <h2 className="text-[26px] font-semibold text-[#2C1F14] mb-2 tracking-tight">Ready to reflect?</h2>
          <p className="text-[#8B6B4A] mb-8 text-[14px]">AI will structure today&apos;s journal into a rich review.</p>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="h-[48px] px-8 bg-[#C4783A] text-white rounded-[8px] text-[15px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed"
          >
            {loading ? "Generating..." : "✨ Generate my review"}
          </button>
          {error && <p className="text-[#C4783A] mt-4 text-[13px]">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {(["daily", "weekly", "monthly"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-[6px] rounded-full text-[13px] font-medium transition-colors ${
              activeTab === tab
                ? "bg-[#2C1F14] text-white"
                : "bg-white border border-[#E4D4C0] text-[#8B6B4A] hover:border-[#C4A98A]"
            }`}
          >
            {tab === "daily" ? "Daily" : tab === "weekly" ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>

      {/* Daily Tab */}
      {activeTab === "daily" && (
        <div className="space-y-3">
          {/* Header */}
          <div className="mb-5">
            <h2 className="text-[26px] font-semibold text-[#2C1F14] tracking-tight">Today&apos;s Review</h2>
            <p className="text-[14px] text-[#8B6B4A] mt-1 mb-7">{dateKey}</p>
          </div>

          {/* Grid layout — 2 columns */}
          <div className="grid grid-cols-2 gap-3">

            {/* One-line insight — full width, warm bg */}
            <RCard full warm>
              <Label en="💡 One-line insight" zh="一句话感悟" />
              <p className="text-[20px] font-semibold text-[#2C1F14] italic leading-relaxed">
                &ldquo;{review!.oneLineInsight}&rdquo;
              </p>
              {review!.oneLineInsightZh && (
                <p className="text-[14px] text-[#A88060] mt-2 leading-relaxed">「{review!.oneLineInsightZh}」</p>
              )}
            </RCard>

            {/* Dynamic tag sections — 用 ?. 防止 Claude 没返回某字段时崩溃 */}
            {review!.people?.length > 0 && <RCard><Label en="👥 People" zh="人物" /><TagList items={review!.people} /></RCard>}
            {review!.emotions?.length > 0 && <RCard><Label en="🌊 Emotions" zh="情绪 · 标签" /><TagList items={review!.emotions} /></RCard>}
            {review!.events?.length > 0 && (
              <RCard>
                <Label en="📅 Events" zh="今日事件" />
                <div className="space-y-3">
                  {review!.events.map((group, i) => (
                    <div key={i}>
                      <p className="text-[11px] font-semibold text-[#C4783A] uppercase tracking-[0.4px] mb-[6px]">{group.category}</p>
                      <div className="flex flex-wrap gap-[6px]">
                        {group.items.map((item, j) => (
                          <span key={j} className="bg-[#FDF0E6] border border-[#E4D4C0] rounded-full px-3 py-1 text-[13px] text-[#4A3324]">{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </RCard>
            )}
            {review!.learning?.length > 0 && <RCard><Label en="🧠 Learning" zh="学到的" /><TagList items={review!.learning} /></RCard>}
            {review!.health?.length > 0 && <RCard><Label en="💪 Health & Body" zh="健康 · 身体" /><TagList items={review!.health} /></RCard>}
            {review!.places?.length > 0 && <RCard><Label en="📍 Places" zh="去了哪里" /><TagList items={review!.places} /></RCard>}
            {review!.books?.length > 0 && <RCard><Label en="📚 Books" zh="在读的书" /><TagList items={review!.books} /></RCard>}
            {review!.mediaConsumed?.length > 0 && <RCard><Label en="🎙 Podcasts & Articles" zh="播客 · 文章" /><TagList items={review!.mediaConsumed} /></RCard>}
            {review!.moviesTV?.length > 0 && <RCard><Label en="🎬 Movies & TV" zh="影视" /><TagList items={review!.moviesTV} /></RCard>}
            {review!.parenting?.length > 0 && <RCard><Label en="👶 Parenting" zh="育儿" /><TagList items={review!.parenting} /></RCard>}
            {review!.finance?.length > 0 && <RCard><Label en="💰 Finance" zh="理财 · 消费" /><TagList items={review!.finance} /></RCard>}
            {review!.creativeOutput?.length > 0 && <RCard><Label en="✍️ Creative Output" zh="创作输出" /><TagList items={review!.creativeOutput} /></RCard>}

            {/* Score */}
            <RCard>
              <Label en="⭐ Score" zh="今日评分" />
              <div className="text-[52px] font-bold text-[#2C1F14] leading-none">{review!.score}</div>
              <div className="text-[13px] text-[#8B6B4A] mt-1">/10 · {review!.scoreReason}</div>
              <div className="flex gap-[5px] mt-3">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className={`w-[10px] h-[10px] rounded-full ${i < review!.score ? "bg-[#C4783A]" : "bg-[#E4D4C0]"}`} />
                ))}
              </div>
            </RCard>

            {/* Energy distribution */}
            {Object.keys(review!.energyDistribution).length > 0 && (
              <RCard>
                <Label en="⚡ Energy distribution" zh="精力分布" />
                <div className="space-y-[10px]">
                  {Object.entries(review!.energyDistribution).map(([label, pct]) => (
                    <div key={label}>
                      <div className="flex justify-between text-[13px] text-[#8B6B4A] mb-[5px]">
                        <span>{label}</span><span>{pct}%</span>
                      </div>
                      <div className="h-[6px] bg-[#F5EDE0] rounded-full">
                        {/* eslint-disable-next-line react/forbid-component-props */}
                        <div className="h-[6px] bg-[#C4783A] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </RCard>
            )}

            {/* Progress zones */}
            {(review!.progressZones.breakthrough || review!.progressZones.inPractice || review!.progressZones.plantedSeed) && (
              <RCard>
                <Label en="🌱 Progress zones" zh="成长区域" />
                <div className="space-y-[10px]">
                  {review!.progressZones.breakthrough && (
                    <p className="text-[14px] text-[#4A3324]">🟢 <strong className="text-[#2C1F14]">Breakthrough:</strong> {review!.progressZones.breakthrough}</p>
                  )}
                  {review!.progressZones.inPractice && (
                    <p className="text-[14px] text-[#4A3324]">🟡 <strong className="text-[#2C1F14]">In practice:</strong> {review!.progressZones.inPractice}</p>
                  )}
                  {review!.progressZones.plantedSeed && (
                    <p className="text-[14px] text-[#4A3324]">🔵 <strong className="text-[#2C1F14]">Planted seed:</strong> {review!.progressZones.plantedSeed}</p>
                  )}
                </div>
              </RCard>
            )}

            {/* Next steps — full width */}
            {review!.nextSteps.length > 0 && (
              <RCard full>
                <Label en="🎯 Next steps" zh="下一步行动" />
                <div className="divide-y divide-[#EDE3D8]">
                  {review!.nextSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 py-[9px]">
                      <div className="w-[18px] h-[18px] border-[1.5px] border-[#C4A98A] rounded-[4px] flex-shrink-0 mt-[1px]" />
                      <span className="text-[14px] text-[#4A3324]">{step}</span>
                    </div>
                  ))}
                </div>
              </RCard>
            )}

            {/* Review paragraph — full width */}
            <RCard full>
              <Label en="🪞 Today's reflection" zh="复盘" />
              <p className="text-[15px] text-[#4A3324] leading-[1.8]">{review!.reviewParagraph}</p>
            </RCard>

            {/* Psych note — full width, warm bg */}
            {review!.psychNote && (
              <RCard full warm>
                <Label en="🧘 A note for you" zh="心理学正能量话" />
                <p className="text-[14px] text-[#8B6B4A] leading-[1.8] italic">{review!.psychNote}</p>
              </RCard>
            )}

            {/* HandLog image — full width */}
            <RCard full>
              <Label en="🖼 HandLog Image" zh="手账图" />
              <HandLogSection
                review={review!}
                calloutId={calloutId}
                imgUrl={imgUrl} setImgUrl={setImgUrl}
                loading={imgLoading} setLoading={setImgLoading}
              />
            </RCard>

          </div>
        </div>
      )}

      {/* Weekly Tab */}
      {activeTab === "weekly" && (
        <div className="space-y-4">
          <div className="mb-5">
            <h2 className="text-[26px] font-semibold text-[#2C1F14] tracking-tight">Weekly Review</h2>
            <p className="text-[14px] text-[#8B6B4A] mt-1">Week of {weekLabel}</p>
          </div>
          {!weekReview ? (
            <div className="text-center py-16">
              <p className="text-[#8B6B4A] mb-6 text-[14px]">Generate a summary of your week from all daily entries.</p>
              <button
                type="button"
                onClick={generateWeekly}
                disabled={weekLoading}
                className="h-[48px] px-8 bg-[#C4783A] text-white rounded-[8px] text-[15px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed"
              >
                {weekLoading ? "Generating..." : "✨ Generate weekly review"}
              </button>
              {weekError && <p className="text-[#C4783A] mt-4 text-[13px]">{weekError}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <RCard full warm>
                <Label en="💡 Weekly insight" zh="本周感悟" />
                <p className="text-[18px] font-semibold text-[#2C1F14] italic leading-relaxed">{weekReview.oneLineInsight}</p>
                {weekReview.oneLineInsightZh && <p className="text-[13px] text-[#8B6B4A] mt-1">「{weekReview.oneLineInsightZh}」</p>}
              </RCard>
              <RCard>
                <Label en="📈 Score trend" zh="分数趋势" />
                <p className="text-[15px] text-[#2C1F14]">{weekReview.scoreTrend.map(s => s ?? "-").join(" → ")}</p>
                <p className="text-[13px] text-[#8B6B4A] mt-1">Week avg: {weekReview.score}/10</p>
              </RCard>
              <RCard>
                <Label en="🌊 Emotion pattern" zh="情绪规律" />
                <p className="text-[14px] text-[#2C1F14]">{weekReview.emotionPattern}</p>
              </RCard>
              <RCard>
                <Label en="🔍 Core challenge" zh="核心困境" />
                <p className="text-[14px] text-[#2C1F14]">{weekReview.coreProblem}</p>
              </RCard>
              {weekReview.crossWeekFlag && (
                <RCard full>
                  <Label en="🚩 Cross-week signal" zh="跨周信号" />
                  <p className="text-[14px] text-[#2C1F14]">{weekReview.crossWeekFlag}</p>
                </RCard>
              )}
              <RCard full>
                <Label en="🪞 Review" zh="周复盘" />
                <p className="text-[14px] text-[#2C1F14] leading-relaxed">{weekReview.reviewParagraph}</p>
              </RCard>
              {weekReview.nextSteps.length > 0 && (
                <RCard full>
                  <Label en="🎯 Next week" zh="下周计划" />
                  <ul className="space-y-1 mt-1">
                    {weekReview.nextSteps.map((s, i) => (
                      <li key={i} className="text-[13px] text-[#2C1F14] flex gap-2">
                        <span className="text-[#C4783A]">→</span>{s}
                      </li>
                    ))}
                  </ul>
                </RCard>
              )}
            </div>
          )}
        </div>
      )}

      {/* Monthly Tab */}
      {activeTab === "monthly" && (
        <div className="space-y-4">
          <div className="mb-5">
            <h2 className="text-[26px] font-semibold text-[#2C1F14] tracking-tight">Monthly Review</h2>
            <p className="text-[14px] text-[#8B6B4A] mt-1">{new Date().toLocaleString("en", { month: "long", year: "numeric" })}</p>
          </div>
          {!monthReview ? (
            <div className="text-center py-16">
              <p className="text-[#8B6B4A] mb-6 text-[14px]">Generate a monthly synthesis from all weekly reviews.</p>
              <button
                type="button"
                onClick={generateMonthly}
                disabled={monthLoading}
                className="h-[48px] px-8 bg-[#C4783A] text-white rounded-[8px] text-[15px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed"
              >
                {monthLoading ? "Generating..." : "✨ Generate monthly review"}
              </button>
              {monthError && <p className="text-[#C4783A] mt-4 text-[13px]">{monthError}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <RCard full warm>
                <Label en="💡 Monthly insight" zh="本月感悟" />
                <p className="text-[18px] font-semibold text-[#2C1F14] italic leading-relaxed">{monthReview.oneLineInsight}</p>
                {monthReview.oneLineInsightZh && <p className="text-[13px] text-[#8B6B4A] mt-1">「{monthReview.oneLineInsightZh}」</p>}
              </RCard>
              <RCard>
                <Label en="📊 Monthly pattern" zh="本月规律" />
                <p className="text-[14px] text-[#2C1F14]">{monthReview.monthlyPattern}</p>
              </RCard>
              <RCard>
                <Label en="🌊 Emotion pattern" zh="情绪规律" />
                <p className="text-[14px] text-[#2C1F14]">{monthReview.emotionPattern}</p>
              </RCard>
              <RCard>
                <Label en="🔍 Core challenge" zh="核心困境" />
                <p className="text-[14px] text-[#2C1F14]">{monthReview.coreProblem}</p>
              </RCard>
              <RCard full>
                <Label en="🪞 Review" zh="月复盘" />
                <p className="text-[14px] text-[#2C1F14] leading-relaxed">{monthReview.reviewParagraph}</p>
              </RCard>
              {monthReview.nextMonthDirection?.length > 0 && (
                <RCard full>
                  <Label en="🧭 Next month" zh="下月方向" />
                  <ul className="space-y-1 mt-1">
                    {monthReview.nextMonthDirection.map((s, i) => (
                      <li key={i} className="text-[13px] text-[#2C1F14] flex gap-2">
                        <span className="text-[#C4783A]">→</span>{s}
                      </li>
                    ))}
                  </ul>
                </RCard>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function RCard({ children, full, warm }: { children: React.ReactNode; full?: boolean; warm?: boolean }) {
  return (
    <div className={`rounded-[14px] p-5 border border-[#E4D4C0]
      shadow-[rgba(80,40,10,0.03)_0_0_0_1px,rgba(80,40,10,0.05)_0_2px_6px,rgba(80,40,10,0.08)_0_4px_12px]
      ${full ? "col-span-2" : ""}
      ${warm ? "bg-[#F5EDE0]" : "bg-[#FDFAF6]"}`}>
      {children}
    </div>
  );
}

function Label({ en, zh }: { en: string; zh: string }) {
  return (
    <div className="mb-[10px]">
      <p className="text-[11px] font-bold text-[#8B6B4A] uppercase tracking-[0.6px]">{en}</p>
      <p className="text-[10px] text-[#C4A98A] mt-[1px]">{zh}</p>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-[6px]">
      {items.map((item, i) => {
        const colonIdx = item.search(/[:：]/);
        const hasColon = colonIdx > 0;
        return (
          <span key={i} className="bg-[#FDF0E6] border border-[#E4D4C0] rounded-full px-3 py-1 text-[13px] text-[#4A3324]">
            {hasColon ? (
              <>
                <span className="font-semibold text-[#2C1F14]">{item.slice(0, colonIdx)}</span>
                <span className="text-[#8B6B4A]">：</span>
                {item.slice(colonIdx + 1).trim()}
              </>
            ) : item}
          </span>
        );
      })}
    </div>
  );
}

// ── HandLog image section ─────────────────────────────────────────────────────

interface HandLogSectionProps {
  review: DailyReview;
  calloutId: string | null;
  imgUrl: string | null; setImgUrl: (u: string | null) => void;
  loading: boolean; setLoading: (v: boolean) => void;
}

function HandLogSection({ review, calloutId, imgUrl, setImgUrl, loading, setLoading }: HandLogSectionProps) {
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true); setError(null); setImgUrl(null);
    try {
      const res = await fetch("/api/handlog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review, calloutId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Generation failed"); }
      const data = await res.json();
      setImgUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div>
      {imgUrl ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt="HandLog" className="w-full rounded-[14px] border border-[#E4D4C0]" />
          <div className="flex gap-2">
            <button type="button" onClick={() => window.open(imgUrl, "_blank")}
              className="flex-1 h-[44px] bg-white text-[#2C1F14] border border-[#C4A98A] rounded-[8px] text-[14px] font-medium hover:bg-[#FAF5EE] transition-colors">
              ⬇ Open full size
            </button>
            <button type="button" onClick={generate} disabled={loading}
              className="flex-1 h-[44px] bg-[#C4783A] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#A85E28] transition-colors disabled:opacity-50">
              {loading ? "Generating..." : "↺ Regenerate"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={generate} disabled={loading}
          className="w-full h-[48px] bg-[#C4783A] text-white rounded-[8px] text-[15px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed">
          {loading ? "Generating... (this takes ~20s)" : "✨ Generate HandLog image →"}
        </button>
      )}
      {error && <p className="text-[#C4783A] mt-3 text-[13px]">{error}</p>}
    </div>
  );
}
