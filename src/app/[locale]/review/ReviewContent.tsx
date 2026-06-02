"use client";

import { useState, useEffect } from "react";
import type { DailyReview, WeeklyReview, MonthlyReview, DueDate } from "@/lib/claude";

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
  const [weekPageId, setWeekPageId] = useState<string | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [weekSaving, setWeekSaving] = useState(false);
  const [weekSaved, setWeekSaved] = useState(false);
  const [monthReview, setMonthReview] = useState<MonthlyReview | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [monthSaving, setMonthSaving] = useState(false);
  const [monthSaved, setMonthSaved] = useState(false);
  const [monthYear, setMonthYear] = useState(() => new Date().getFullYear());
  const [monthMonth, setMonthMonth] = useState(() => new Date().getMonth() + 1);

  // Weekly Table state
  const [weekTable, setWeekTable] = useState<string | null>(null);
  const [weekTableLoading, setWeekTableLoading] = useState(false);
  const [weekTableError, setWeekTableError] = useState<string | null>(null);
  const [weekTableSaving, setWeekTableSaving] = useState(false);
  const [weekTableSaved, setWeekTableSaved] = useState(false);
  const [weekTablePageId, setWeekTablePageId] = useState<string | null>(null);

  // Monthly Table state
  const [monthTable, setMonthTable] = useState<string | null>(null);
  const [monthTableLoading, setMonthTableLoading] = useState(false);
  const [monthTableError, setMonthTableError] = useState<string | null>(null);
  const [monthTableSaving, setMonthTableSaving] = useState(false);
  const [monthTableSaved, setMonthTableSaved] = useState(false);

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
    setWeekReview(null);
    setWeekSaved(false);
    try {
      const res = await fetch("/api/review/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekLabel }),
      });
      const data = await res.json() as WeeklyReview & { weekPageId?: string };
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed");
      setWeekPageId(data.weekPageId ?? null);
      setWeekReview(data);
    } catch (err) {
      setWeekError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setWeekLoading(false);
    }
  };

  const saveWeekly = async () => {
    if (!weekReview || !weekPageId) return;
    setWeekSaving(true);
    setWeekError(null);
    try {
      const res = await fetch("/api/review/weekly/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review: weekReview, weekPageId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setWeekSaved(true);
    } catch (err) {
      setWeekError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setWeekSaving(false);
    }
  };

  const generateMonthly = async () => {
    setMonthLoading(true);
    setMonthError(null);
    setMonthReview(null);
    setMonthSaved(false);
    try {
      const res = await fetch("/api/review/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: monthYear, month: monthMonth }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed");
      setMonthReview(data);
    } catch (err) {
      setMonthError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMonthLoading(false);
    }
  };

  // 把复盘对象渲染成可打印的 HTML 并触发打印对话框
  function exportReviewPDF(title: string, data: DailyReview | WeeklyReview | MonthlyReview) {
    // 把字段转成 HTML section 行
    function section(label: string, content: string) {
      if (!content.trim()) return "";
      return `<div class="section"><div class="label">${label}</div><div class="body">${content}</div></div>`;
    }
    function tags(items: string[]) {
      return items.map(t => `<span class="tag">${t.replace(/</g, "&lt;")}</span>`).join(" ");
    }
    function bullets(items: string[]) {
      return `<ul>${items.map(t => `<li>${t.replace(/</g, "&lt;")}</li>`).join("")}</ul>`;
    }

    const r = data;
    const parts: string[] = [
      section("💡 一句话感悟", `<em>${r.oneLineInsight}</em>${r.oneLineInsightZh ? `<br>「${r.oneLineInsightZh}」` : ""}`),
      section("⭐ 评分", `<strong>${r.score}/10</strong> · ${r.scoreReason}`),
      r.people?.length ? section("👥 人物", tags(r.people)) : "",
      r.emotions?.length ? section("🌊 情绪", tags(r.emotions)) : "",
      r.events?.length ? section("📅 事件", r.events.map(g => `<strong>${g.category}</strong>: ${g.items.join("、")}`).join("<br>")) : "",
      r.learning?.length ? section("🧠 学到的", tags(r.learning)) : "",
      r.health?.length ? section("💪 健康", tags(r.health)) : "",
      r.places?.length ? section("📍 地点", tags(r.places)) : "",
      r.books?.length ? section("📚 在读", tags(r.books)) : "",
      r.mediaConsumed?.length ? section("🎙 播客 · 文章", tags(r.mediaConsumed)) : "",
      r.moviesTV?.length ? section("🎬 影视", tags(r.moviesTV)) : "",
      r.parenting?.length ? section("👶 育儿", tags(r.parenting)) : "",
      r.finance?.length ? section("💰 理财", tags(r.finance)) : "",
      r.creativeOutput?.length ? section("✍️ 创作", tags(r.creativeOutput)) : "",
      Object.keys(r.energyDistribution).length ? section("⚡ 精力分布", Object.entries(r.energyDistribution).map(([k, v]) => `${k} ${v}%`).join(" · ")) : "",
      (r.progressZones.breakthrough || r.progressZones.inPractice || r.progressZones.plantedSeed)
        ? section("🌱 成长区域", [
          r.progressZones.breakthrough ? `🟢 ${r.progressZones.breakthrough}` : "",
          r.progressZones.inPractice   ? `🟡 ${r.progressZones.inPractice}` : "",
          r.progressZones.plantedSeed  ? `🔵 ${r.progressZones.plantedSeed}` : "",
        ].filter(Boolean).join("<br>")) : "",
      "emotionPattern" in r && r.emotionPattern ? section("🌊 情绪规律", r.emotionPattern) : "",
      "coreProblem" in r && r.coreProblem ? section("🔍 核心困境", r.coreProblem) : "",
      "crossWeekFlag" in r && r.crossWeekFlag ? section("🚩 跨期信号", r.crossWeekFlag) : "",
      "monthlyPattern" in r && r.monthlyPattern ? section("📊 本月规律", r.monthlyPattern) : "",
      r.dueDates?.length ? section("📌 待办日期", bullets(r.dueDates.map(d => `${d.date} · ${d.title}${d.note ? " · " + d.note : ""}`))) : "",
      r.nextSteps.length ? section("🎯 下一步", bullets(r.nextSteps)) : "",
      "nextMonthDirection" in r && r.nextMonthDirection?.length ? section("🧭 下月方向", bullets(r.nextMonthDirection)) : "",
      section("🪞 复盘", r.reviewParagraph),
      r.psychNote ? section("🧘 心理正能量", `<em>${r.psychNote}</em>`) : "",
    ];

    const now = new Date().toLocaleString("zh-CN", { timeZone: "Australia/Melbourne" });
    const filename = `handLog_${title}`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${filename}</title>
<style>
  body { font-family: -apple-system, "Helvetica Neue", sans-serif; max-width: 760px; margin: 0 auto; padding: 32px; color: #2C1F14; }
  h1 { font-size: 20px; color: #C4783A; margin-bottom: 4px; }
  .meta { font-size: 12px; color: #8B6B4A; margin-bottom: 24px; }
  .section { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #E4D4C0; }
  .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8B6B4A; margin-bottom: 6px; }
  .body { font-size: 14px; line-height: 1.7; color: #4A3324; }
  .tag { display: inline-block; background: #FDF0E6; border: 1px solid #E4D4C0; border-radius: 20px; padding: 2px 10px; margin: 2px; font-size: 13px; }
  ul { margin: 4px 0; padding-left: 18px; } li { margin-bottom: 4px; }
  em { color: #2C1F14; font-style: italic; }
  @media print { body { padding: 16px; } }
</style></head><body>
<h1>${title}</h1>
<div class="meta">导出于 ${now}</div>
${parts.filter(Boolean).join("")}
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) return;
    setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 400);
  }

  const saveMonthly = async () => {
    if (!monthReview) return;
    setMonthSaving(true);
    setMonthError(null);
    try {
      const res = await fetch("/api/review/monthly/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review: monthReview }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMonthSaved(true);
    } catch (err) {
      setMonthError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setMonthSaving(false);
    }
  };

  const generateWeekTable = async () => {
    setWeekTableLoading(true);
    setWeekTableError(null);
    setWeekTable(null);
    setWeekTableSaved(false);
    try {
      const res = await fetch("/api/table/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekLabel }),
      });
      const data = await res.json() as { markdownTable?: string; weekPageId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setWeekTable(data.markdownTable ?? null);
      setWeekTablePageId(data.weekPageId ?? null);
    } catch (err) {
      setWeekTableError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setWeekTableLoading(false);
    }
  };

  const saveWeekTable = async () => {
    if (!weekTable || !weekTablePageId) return;
    setWeekTableSaving(true);
    setWeekTableError(null);
    try {
      const res = await fetch("/api/table/weekly/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdownTable: weekTable, weekPageId: weekTablePageId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setWeekTableSaved(true);
    } catch (err) {
      setWeekTableError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setWeekTableSaving(false);
    }
  };

  const generateMonthTable = async () => {
    setMonthTableLoading(true);
    setMonthTableError(null);
    setMonthTable(null);
    setMonthTableSaved(false);
    try {
      const res = await fetch("/api/table/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: monthYear, month: monthMonth }),
      });
      const data = await res.json() as { markdownTable?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMonthTable(data.markdownTable ?? null);
    } catch (err) {
      setMonthTableError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMonthTableLoading(false);
    }
  };

  const saveMonthTable = async () => {
    if (!monthTable) return;
    setMonthTableSaving(true);
    setMonthTableError(null);
    try {
      const res = await fetch("/api/table/monthly/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdownTable: monthTable, year: monthYear, month: monthMonth }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMonthTableSaved(true);
    } catch (err) {
      setMonthTableError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setMonthTableSaving(false);
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

            {/* Due dates — full width */}
            {review!.dueDates?.length > 0 && (
              <RCard full>
                <Label en="📌 Upcoming due dates" zh="待办日期" />
                <DueDatesList items={review!.dueDates} />
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

          {/* Daily PDF export */}
          <div className="flex justify-end mt-2">
            <button type="button"
              onClick={() => exportReviewPDF(`Daily Review · ${dateKey}`, review!)}
              className="h-[34px] px-5 rounded-[8px] text-[13px] font-medium border border-[#3A7BC4] text-[#3A7BC4] hover:bg-[#EEF3FC] transition-colors">
              📄 Export PDF
            </button>
          </div>
        </div>
      )}

      {/* Weekly Tab */}
      {activeTab === "weekly" && (
        <div className="space-y-4">
          <div className="mb-5">
            <h2 className="text-[26px] font-semibold text-[#2C1F14] tracking-tight">Weekly Review <span className="text-[16px] font-normal text-[#8B6B4A]">每周复盘</span></h2>
            {/* 周标签输入框：可以手动改成上周，如 "5-18-24" */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <label className="text-[13px] text-[#8B6B4A]">Week</label>
              <input
                type="text"
                value={weekLabel}
                onChange={e => { setWeekLabel(e.target.value); setWeekReview(null); setWeekTable(null); setWeekTablePageId(null); setWeekTableSaved(false); }}
                placeholder="5-25-31"
                className="w-[120px] h-[34px] px-3 rounded-[8px] border border-[#E4D4C0] text-[13px] text-[#2C1F14] bg-white focus:outline-none focus:border-[#C4A98A]"
              />
              <button
                type="button"
                onClick={generateWeekly}
                disabled={weekLoading}
                className="h-[34px] px-5 bg-[#C4783A] text-white rounded-[8px] text-[13px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed"
              >
                {weekLoading ? "Generating..." : "✨ Generate Weekly Review"}
              </button>
              <button
                type="button"
                onClick={generateWeekTable}
                disabled={weekTableLoading}
                className="h-[34px] px-5 bg-[#C4783A] text-white rounded-[8px] text-[13px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed"
              >
                {weekTableLoading ? "Generating..." : "✨ Generate Weekly Table"}
              </button>
              {weekReview && (
                <>
                  <button
                    type="button"
                    onClick={saveWeekly}
                    disabled={weekSaving || weekSaved}
                    className="h-[34px] px-5 rounded-[8px] text-[13px] font-medium border border-[#C4783A] text-[#C4783A] hover:bg-[#FDF0E6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {weekSaved ? "✓ Saved to Notion" : weekSaving ? "Saving..." : "💾 Save Review"}
                  </button>
                  <button
                    type="button"
                    onClick={() => exportReviewPDF(`Weekly Review · ${weekLabel}`, weekReview)}
                    className="h-[34px] px-5 rounded-[8px] text-[13px] font-medium border border-[#3A7BC4] text-[#3A7BC4] hover:bg-[#EEF3FC] transition-colors"
                  >
                    📄 Export PDF
                  </button>
                </>
              )}
              {weekTable && (
                <button
                  type="button"
                  onClick={saveWeekTable}
                  disabled={weekTableSaving || weekTableSaved}
                  className="h-[34px] px-5 rounded-[8px] text-[13px] font-medium border border-[#C4783A] text-[#C4783A] hover:bg-[#FDF0E6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {weekTableSaved ? "✓ Table Saved" : weekTableSaving ? "Saving..." : "💾 Save Table"}
                </button>
              )}
            </div>
            {weekError && <p className="text-[#C4783A] mt-2 text-[13px]">{weekError}</p>}
            {weekTableError && <p className="text-[#C4783A] mt-1 text-[13px]">{weekTableError}</p>}
          </div>

          {weekReview && (
            <div className="grid grid-cols-2 gap-3">
              {/* Insight — full width warm */}
              <RCard full warm>
                <Label en="💡 Weekly insight" zh="本周感悟" />
                <p className="text-[20px] font-semibold text-[#2C1F14] italic leading-relaxed">&ldquo;{weekReview.oneLineInsight}&rdquo;</p>
                {weekReview.oneLineInsightZh && <p className="text-[14px] text-[#A88060] mt-2 leading-relaxed">「{weekReview.oneLineInsightZh}」</p>}
              </RCard>

              {/* Score trend */}
              <RCard>
                <Label en="📈 Score trend" zh="本周评分" />
                <div className="text-[42px] font-bold text-[#2C1F14] leading-none">{weekReview.score}</div>
                <div className="text-[13px] text-[#8B6B4A] mt-1">/10 · {weekReview.scoreReason}</div>
                <p className="text-[13px] text-[#2C1F14] mt-2">{weekReview.scoreTrend.map(s => s ?? "–").join(" → ")}</p>
              </RCard>

              {weekReview.people?.length > 0 && <RCard><Label en="👥 People" zh="人物" /><PeopleList items={weekReview.people} /></RCard>}
              {weekReview.emotions?.length > 0 && <RCard><Label en="🌊 Emotions" zh="情绪" /><TagList items={weekReview.emotions} /></RCard>}
              {weekReview.events?.length > 0 && (
                <RCard>
                  <Label en="📅 Events" zh="本周事件" />
                  <div className="space-y-3">
                    {weekReview.events.map((group, i) => (
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
              {weekReview.learning?.length > 0 && <RCard><Label en="🧠 Learning" zh="学到的" /><TagList items={weekReview.learning} /></RCard>}
              {weekReview.health?.length > 0 && <RCard><Label en="💪 Health & Body" zh="健康 · 身体" /><TagList items={weekReview.health} /></RCard>}
              {weekReview.places?.length > 0 && <RCard><Label en="📍 Places" zh="去了哪里" /><TagList items={weekReview.places} /></RCard>}
              {weekReview.books?.length > 0 && <RCard><Label en="📚 Books" zh="在读的书" /><TagList items={weekReview.books} /></RCard>}
              {weekReview.mediaConsumed?.length > 0 && <RCard><Label en="🎙 Podcasts & Articles" zh="播客 · 文章" /><TagList items={weekReview.mediaConsumed} /></RCard>}
              {weekReview.moviesTV?.length > 0 && <RCard><Label en="🎬 Movies & TV" zh="影视" /><TagList items={weekReview.moviesTV} /></RCard>}
              {weekReview.parenting?.length > 0 && <RCard><Label en="👶 Parenting" zh="育儿" /><TagList items={weekReview.parenting} /></RCard>}
              {weekReview.finance?.length > 0 && <RCard><Label en="💰 Finance" zh="理财 · 消费" /><TagList items={weekReview.finance} /></RCard>}
              {weekReview.creativeOutput?.length > 0 && <RCard><Label en="✍️ Creative Output" zh="创作输出" /><TagList items={weekReview.creativeOutput} /></RCard>}

              {Object.keys(weekReview.energyDistribution).length > 0 && (
                <RCard>
                  <Label en="⚡ Energy distribution" zh="精力分布" />
                  <div className="space-y-[10px]">
                    {Object.entries(weekReview.energyDistribution).map(([label, pct]) => (
                      <div key={label}>
                        <div className="flex justify-between text-[13px] text-[#8B6B4A] mb-[5px]"><span>{label}</span><span>{pct}%</span></div>
                        <div className="h-[6px] bg-[#F5EDE0] rounded-full">
                          {/* eslint-disable-next-line react/forbid-component-props */}
                          <div className="h-[6px] bg-[#C4783A] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </RCard>
              )}

              {(weekReview.progressZones.breakthrough || weekReview.progressZones.inPractice || weekReview.progressZones.plantedSeed) && (
                <RCard>
                  <Label en="🌱 Progress zones" zh="成长区域" />
                  <div className="space-y-[10px]">
                    {weekReview.progressZones.breakthrough && <p className="text-[14px] text-[#4A3324]">🟢 <strong className="text-[#2C1F14]">Breakthrough:</strong> {weekReview.progressZones.breakthrough}</p>}
                    {weekReview.progressZones.inPractice && <p className="text-[14px] text-[#4A3324]">🟡 <strong className="text-[#2C1F14]">In practice:</strong> {weekReview.progressZones.inPractice}</p>}
                    {weekReview.progressZones.plantedSeed && <p className="text-[14px] text-[#4A3324]">🔵 <strong className="text-[#2C1F14]">Planted seed:</strong> {weekReview.progressZones.plantedSeed}</p>}
                  </div>
                </RCard>
              )}

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

              {weekReview.dueDates?.length > 0 && (
                <RCard full>
                  <Label en="📌 Upcoming due dates" zh="待办日期" />
                  <DueDatesList items={weekReview.dueDates} />
                </RCard>
              )}

              {weekReview.nextSteps.length > 0 && (
                <RCard full>
                  <Label en="🎯 Next week" zh="下周计划" />
                  <div className="divide-y divide-[#EDE3D8]">
                    {weekReview.nextSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 py-[9px]">
                        <div className="w-[18px] h-[18px] border-[1.5px] border-[#C4A98A] rounded-[4px] flex-shrink-0 mt-[1px]" />
                        <span className="text-[14px] text-[#4A3324]">{step}</span>
                      </div>
                    ))}
                  </div>
                </RCard>
              )}

              <RCard full>
                <Label en="🪞 Weekly reflection" zh="周复盘" />
                <p className="text-[15px] text-[#4A3324] leading-[1.8]">{weekReview.reviewParagraph}</p>
              </RCard>

              {weekReview.psychNote && (
                <RCard full warm>
                  <Label en="🧘 A note for you" zh="心理学正能量话" />
                  <p className="text-[14px] text-[#8B6B4A] leading-[1.8] italic">{weekReview.psychNote}</p>
                </RCard>
              )}
            </div>
          )}

          {/* ── Weekly Table Preview ─────────────────────────────── */}
          {weekTable && <TablePreview markdown={weekTable} />}
        </div>
      )}

      {/* Monthly Tab */}
      {activeTab === "monthly" && (
        <div className="space-y-4">
          <div className="mb-5">
            <h2 className="text-[26px] font-semibold text-[#2C1F14] tracking-tight">Monthly Review <span className="text-[16px] font-normal text-[#8B6B4A]">每月复盘</span></h2>
            {/* 年月选择器：可以切换到过去任意月份 */}
            <div className="flex items-center gap-3 mt-3">
              <label className="text-[13px] text-[#8B6B4A]">Month</label>
              <select
                title="Year"
                value={monthYear}
                onChange={e => { setMonthYear(Number(e.target.value)); setMonthReview(null); }}
                className="h-[34px] px-3 rounded-[8px] border border-[#E4D4C0] text-[13px] text-[#2C1F14] bg-white focus:outline-none focus:border-[#C4A98A]"
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                title="Month"
                value={monthMonth}
                onChange={e => { setMonthMonth(Number(e.target.value)); setMonthReview(null); }}
                className="h-[34px] px-3 rounded-[8px] border border-[#E4D4C0] text-[13px] text-[#2C1F14] bg-white focus:outline-none focus:border-[#C4A98A]"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
              <button
                type="button"
                onClick={generateMonthly}
                disabled={monthLoading}
                className="h-[34px] px-5 bg-[#C4783A] text-white rounded-[8px] text-[13px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed"
              >
                {monthLoading ? "Generating..." : "✨ Generate Monthly Review"}
              </button>
              <button
                type="button"
                onClick={generateMonthTable}
                disabled={monthTableLoading}
                className="h-[34px] px-5 bg-[#C4783A] text-white rounded-[8px] text-[13px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed"
              >
                {monthTableLoading ? "Generating..." : "✨ Generate Monthly Table"}
              </button>
              {monthReview && (
                <>
                  <button
                    type="button"
                    onClick={saveMonthly}
                    disabled={monthSaving || monthSaved}
                    className="h-[34px] px-5 rounded-[8px] text-[13px] font-medium border border-[#C4783A] text-[#C4783A] hover:bg-[#FDF0E6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {monthSaved ? "✓ Saved to Notion" : monthSaving ? "Saving..." : "💾 Save Review"}
                  </button>
                  <button
                    type="button"
                    onClick={() => exportReviewPDF(`Monthly Review · ${monthYear}年${monthMonth}月`, monthReview)}
                    className="h-[34px] px-5 rounded-[8px] text-[13px] font-medium border border-[#3A7BC4] text-[#3A7BC4] hover:bg-[#EEF3FC] transition-colors"
                  >
                    📄 Export PDF
                  </button>
                </>
              )}
              {monthTable && (
                <button
                  type="button"
                  onClick={saveMonthTable}
                  disabled={monthTableSaving || monthTableSaved}
                  className="h-[34px] px-5 rounded-[8px] text-[13px] font-medium border border-[#C4783A] text-[#C4783A] hover:bg-[#FDF0E6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {monthTableSaved ? "✓ Table Saved" : monthTableSaving ? "Saving..." : "💾 Save Table"}
                </button>
              )}
            </div>
            {monthError && <p className="text-[#C4783A] mt-2 text-[13px]">{monthError}</p>}
            {monthTableError && <p className="text-[#C4783A] mt-1 text-[13px]">{monthTableError}</p>}
          </div>

          {monthReview && (
            <div className="grid grid-cols-2 gap-3">
              {/* Insight — full width warm */}
              <RCard full warm>
                <Label en="💡 Monthly insight" zh="本月感悟" />
                <p className="text-[20px] font-semibold text-[#2C1F14] italic leading-relaxed">&ldquo;{monthReview.oneLineInsight}&rdquo;</p>
                {monthReview.oneLineInsightZh && <p className="text-[14px] text-[#A88060] mt-2 leading-relaxed">「{monthReview.oneLineInsightZh}」</p>}
              </RCard>

              {/* Score */}
              <RCard>
                <Label en="⭐ Score" zh="本月评分" />
                <div className="text-[42px] font-bold text-[#2C1F14] leading-none">{monthReview.score}</div>
                <div className="text-[13px] text-[#8B6B4A] mt-1">/10 · {monthReview.scoreReason}</div>
              </RCard>

              {monthReview.people?.length > 0 && <RCard><Label en="👥 People" zh="人物" /><PeopleList items={monthReview.people} /></RCard>}
              {monthReview.emotions?.length > 0 && <RCard><Label en="🌊 Emotions" zh="情绪" /><TagList items={monthReview.emotions} /></RCard>}
              {monthReview.events?.length > 0 && (
                <RCard>
                  <Label en="📅 Events" zh="本月事件" />
                  <div className="space-y-3">
                    {monthReview.events.map((group, i) => (
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
              {monthReview.learning?.length > 0 && <RCard><Label en="🧠 Learning" zh="学到的" /><TagList items={monthReview.learning} /></RCard>}
              {monthReview.health?.length > 0 && <RCard><Label en="💪 Health & Body" zh="健康 · 身体" /><TagList items={monthReview.health} /></RCard>}
              {monthReview.places?.length > 0 && <RCard><Label en="📍 Places" zh="去了哪里" /><TagList items={monthReview.places} /></RCard>}
              {monthReview.books?.length > 0 && <RCard><Label en="📚 Books" zh="在读的书" /><TagList items={monthReview.books} /></RCard>}
              {monthReview.mediaConsumed?.length > 0 && <RCard><Label en="🎙 Podcasts & Articles" zh="播客 · 文章" /><TagList items={monthReview.mediaConsumed} /></RCard>}
              {monthReview.moviesTV?.length > 0 && <RCard><Label en="🎬 Movies & TV" zh="影视" /><TagList items={monthReview.moviesTV} /></RCard>}
              {monthReview.parenting?.length > 0 && <RCard><Label en="👶 Parenting" zh="育儿" /><TagList items={monthReview.parenting} /></RCard>}
              {monthReview.finance?.length > 0 && <RCard><Label en="💰 Finance" zh="理财 · 消费" /><TagList items={monthReview.finance} /></RCard>}
              {monthReview.creativeOutput?.length > 0 && <RCard><Label en="✍️ Creative Output" zh="创作输出" /><TagList items={monthReview.creativeOutput} /></RCard>}

              {Object.keys(monthReview.energyDistribution).length > 0 && (
                <RCard>
                  <Label en="⚡ Energy distribution" zh="精力分布" />
                  <div className="space-y-[10px]">
                    {Object.entries(monthReview.energyDistribution).map(([label, pct]) => (
                      <div key={label}>
                        <div className="flex justify-between text-[13px] text-[#8B6B4A] mb-[5px]"><span>{label}</span><span>{pct}%</span></div>
                        <div className="h-[6px] bg-[#F5EDE0] rounded-full">
                          {/* eslint-disable-next-line react/forbid-component-props */}
                          <div className="h-[6px] bg-[#C4783A] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </RCard>
              )}

              {(monthReview.progressZones.breakthrough || monthReview.progressZones.inPractice || monthReview.progressZones.plantedSeed) && (
                <RCard>
                  <Label en="🌱 Progress zones" zh="成长区域" />
                  <div className="space-y-[10px]">
                    {monthReview.progressZones.breakthrough && <p className="text-[14px] text-[#4A3324]">🟢 <strong className="text-[#2C1F14]">Breakthrough:</strong> {monthReview.progressZones.breakthrough}</p>}
                    {monthReview.progressZones.inPractice && <p className="text-[14px] text-[#4A3324]">🟡 <strong className="text-[#2C1F14]">In practice:</strong> {monthReview.progressZones.inPractice}</p>}
                    {monthReview.progressZones.plantedSeed && <p className="text-[14px] text-[#4A3324]">🔵 <strong className="text-[#2C1F14]">Planted seed:</strong> {monthReview.progressZones.plantedSeed}</p>}
                  </div>
                </RCard>
              )}

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
              {monthReview.crossWeekFlag && (
                <RCard full>
                  <Label en="🚩 Recurring signal" zh="跨月信号" />
                  <p className="text-[14px] text-[#2C1F14]">{monthReview.crossWeekFlag}</p>
                </RCard>
              )}

              {monthReview.dueDates?.length > 0 && (
                <RCard full>
                  <Label en="📌 Upcoming due dates" zh="待办日期" />
                  <DueDatesList items={monthReview.dueDates} />
                </RCard>
              )}

              {monthReview.nextSteps.length > 0 && (
                <RCard full>
                  <Label en="🎯 Next steps" zh="下一步行动" />
                  <div className="divide-y divide-[#EDE3D8]">
                    {monthReview.nextSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 py-[9px]">
                        <div className="w-[18px] h-[18px] border-[1.5px] border-[#C4A98A] rounded-[4px] flex-shrink-0 mt-[1px]" />
                        <span className="text-[14px] text-[#4A3324]">{step}</span>
                      </div>
                    ))}
                  </div>
                </RCard>
              )}

              <RCard full>
                <Label en="🪞 Monthly reflection" zh="月复盘" />
                <p className="text-[15px] text-[#4A3324] leading-[1.8]">{monthReview.reviewParagraph}</p>
              </RCard>

              {monthReview.nextMonthDirection?.length > 0 && (
                <RCard full>
                  <Label en="🧭 Next month direction" zh="下月方向" />
                  <div className="divide-y divide-[#EDE3D8]">
                    {monthReview.nextMonthDirection.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 py-[9px]">
                        <div className="w-[18px] h-[18px] border-[1.5px] border-[#C4A98A] rounded-[4px] flex-shrink-0 mt-[1px]" />
                        <span className="text-[14px] text-[#4A3324]">{s}</span>
                      </div>
                    ))}
                  </div>
                </RCard>
              )}

              {monthReview.psychNote && (
                <RCard full warm>
                  <Label en="🧘 A note for you" zh="心理学正能量话" />
                  <p className="text-[14px] text-[#8B6B4A] leading-[1.8] italic">{monthReview.psychNote}</p>
                </RCard>
              )}
            </div>
          )}

          {/* ── Monthly Table Preview ────────────────────────────── */}
          {monthTable && <TablePreview markdown={monthTable} />}
        </div>
      )}
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

// 把 markdown 表格字符串渲染成 HTML 表格
// 格式：第一行是 header，第二行是分隔线（跳过），其余是数据行
// 每个单元格里用 "  •" 分隔的 bullet points 会换行显示
function TablePreview({ markdown }: { markdown: string }) {
  const rows = markdown
    .split("\n")
    .filter(line => line.trim().startsWith("|"))
    .map(line =>
      line.split("|").slice(1, -1).map(cell => cell.trim())
    );

  const [header, , ...dataRows] = rows; // 跳过第二行（分隔线 |---|---|）
  if (!header) return null;

  return (
    <div className="overflow-x-auto mt-4 rounded-[12px] border border-[#E4D4C0]">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="bg-[#F5EDE0]">
            {header.map((h, i) => (
              <th key={i} className="text-left px-4 py-[10px] text-[#8B6B4A] font-semibold border-b border-[#E4D4C0] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-[#FDFAF6]"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-[10px] text-[#4A3324] border-b border-[#F0E8DC] align-top">
                  {ci === 0 ? (
                    // 日期列：不拆分
                    <span className="font-medium text-[#2C1F14] whitespace-nowrap">{cell}</span>
                  ) : (
                    // 事项列：按 bullet 拆成多行
                    <ul className="space-y-[4px]">
                      {cell.split("•").filter(s => s.trim()).map((item, ii) => (
                        <li key={ii} className="flex items-start gap-1">
                          <span className="text-[#C4783A] mt-[2px] flex-shrink-0">•</span>
                          <span>{item.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
      <p className="text-[11px] font-bold text-[#8B6B4A] uppercase tracking-[0.6px]">{zh}</p>
      <p className="text-[10px] text-[#C4A98A] mt-[1px]">{en}</p>
    </div>
  );
}

// 人物专用列表：把 "姓名：描述" 分成名字（粗体）+ 描述（小字），比 tag pill 更易读
function PeopleList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-col gap-[8px]">
      {items.map((item, i) => {
        const colonIdx = item.search(/[:：]/);
        const name = colonIdx > 0 ? item.slice(0, colonIdx).trim() : item;
        const desc = colonIdx > 0 ? item.slice(colonIdx + 1).trim() : null;
        return (
          <div key={i} className="flex items-baseline gap-2">
            <span className="font-semibold text-[13px] text-[#2C1F14] shrink-0">{name}</span>
            {desc && <span className="text-[12px] text-[#8B6B4A] leading-relaxed">{desc}</span>}
          </div>
        );
      })}
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

// ── Due dates section ─────────────────────────────────────────────────────────

function DueDatesList({ items }: { items: DueDate[] }) {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="flex flex-wrap gap-[6px]">
      {sorted.map((item, i) => (
        <span key={i} className="bg-[#FDF0E6] border border-[#E4D4C0] rounded-full px-3 py-1 text-[13px] text-[#4A3324]">
          <span className="font-semibold text-[#2C1F14]">{item.date}</span>
          <span className="text-[#8B6B4A]">：</span>
          {item.title}{item.note ? ` · ${item.note}` : ""}
        </span>
      ))}
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
