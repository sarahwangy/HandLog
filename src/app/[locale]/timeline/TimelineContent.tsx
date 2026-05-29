"use client";

import { useState, useEffect, useMemo } from "react";
import type { WeekEntry } from "@/lib/timeline";

export default function TimelineContent() {
  const [entries, setEntries] = useState<WeekEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [visibleMonths, setVisibleMonths] = useState(3);

  useEffect(() => {
    fetch("/api/timeline")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setEntries(data.entries);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const allLabels = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.labels.forEach((l) => set.add(l)));
    return Array.from(set);
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((e) => {
      const matchLabel = !activeLabel || e.labels.includes(activeLabel);
      const matchSearch = !q || e.insight.toLowerCase().includes(q) || e.weekLabel.includes(q);
      return matchLabel && matchSearch;
    });
  }, [entries, search, activeLabel]);

  // 按月分组（取周一所在月）
  const grouped = useMemo(() => {
    const map = new Map<string, WeekEntry[]>();
    for (const entry of filtered) {
      const [year, month] = entry.mondayDate.split("-");
      const key = `${year}年${parseInt(month)}月`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const isFiltering = !!search || !!activeLabel;
  const visibleGroups = isFiltering ? grouped : grouped.slice(0, visibleMonths);
  const hasMore = !isFiltering && grouped.length > visibleMonths;

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-[#8B6B4A] text-[14px]">Loading...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-[#C4783A] text-[14px]">{error}</p>
    </div>
  );

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-6 sm:py-8">

      <div className="mb-5">
        <h1 className="text-[20px] font-semibold text-[#2C1F14] tracking-tight">Timeline</h1>
        <p className="text-[13px] text-[#8B6B4A] mt-[2px]">每一周的足迹</p>
      </div>

      {/* 搜索框 */}
      <input
        type="text"
        placeholder="搜索感悟内容..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-[40px] px-4 rounded-[10px] border border-[#E4D4C0] bg-white text-[13px] text-[#2C1F14] placeholder-[#C4A98A] focus:outline-none focus:border-[#C4783A] mb-3"
      />

      {/* 标签筛选 */}
      {allLabels.length > 0 && (
        <div className="flex flex-wrap gap-[6px] mb-6">
          <button type="button" onClick={() => setActiveLabel(null)}
            className={`px-3 py-1 rounded-full text-[12px] border transition-colors ${!activeLabel ? "bg-[#2C1F14] text-white border-[#2C1F14]" : "bg-white text-[#8B6B4A] border-[#E4D4C0] hover:border-[#C4A98A]"}`}>
            全部
          </button>
          {allLabels.map((label) => (
            <button key={label} type="button" onClick={() => setActiveLabel(activeLabel === label ? null : label)}
              className={`px-3 py-1 rounded-full text-[12px] border transition-colors ${activeLabel === label ? "bg-[#C4783A] text-white border-[#C4783A]" : "bg-white text-[#8B6B4A] border-[#E4D4C0] hover:border-[#C4A98A]"}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* 按月分组的周卡片 */}
      {visibleGroups.length === 0 ? (
        <p className="text-center text-[#8B6B4A] py-16 text-[14px]">没有找到匹配的记录</p>
      ) : (
        visibleGroups.map(([month, monthEntries]) => (
          <div key={month} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[14px] font-semibold text-[#2C1F14]">{month}</h2>
              <span className="text-[12px] text-[#8B6B4A]">· {monthEntries.length} 周</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {monthEntries.map((entry, i) => (
                <WeekCard key={entry.weekPageId} entry={entry} colorIndex={i} />
              ))}
            </div>
          </div>
        ))
      )}

      {hasMore && (
        <div className="flex justify-center mt-4 mb-10">
          <button type="button" onClick={() => setVisibleMonths((n) => n + 2)}
            className="h-[40px] px-6 rounded-full border border-[#E4D4C0] text-[13px] text-[#8B6B4A] hover:border-[#C4A98A] hover:text-[#2C1F14] transition-colors bg-white">
            查看更多 · 还有 {grouped.length - visibleMonths} 个月
          </button>
        </div>
      )}
    </div>
  );
}

// 卡片顶部渐变色
const CARD_COLORS = [
  { bg: "linear-gradient(135deg, #FDF0F0 0%, #F5D8D8 100%)", text: "#B86070" },
  { bg: "linear-gradient(135deg, #EEF5EE 0%, #D4E8D4 100%)", text: "#5A8A5A" },
  { bg: "linear-gradient(135deg, #F0EEF8 0%, #DDD4F0 100%)", text: "#7A6AB0" },
  { bg: "linear-gradient(135deg, #FDF4EC 0%, #F0E0C8 100%)", text: "#B87040" },
  { bg: "linear-gradient(135deg, #EEF2F8 0%, #D4DFF0 100%)", text: "#5A6A98" },
];

const TAG_COLORS = [
  { bg: "#FDE8E8", text: "#C4707A" },
  { bg: "#E8F5E8", text: "#5A9A5A" },
  { bg: "#EDE8F5", text: "#7A6AAA" },
  { bg: "#FFF3E0", text: "#C4783A" },
  { bg: "#E8F0FA", text: "#5A7AB8" },
];

function WeekCard({ entry, colorIndex }: { entry: WeekEntry; colorIndex: number }) {
  const color = CARD_COLORS[colorIndex % CARD_COLORS.length];
  const notionUrl = `https://www.notion.so/${entry.weekPageId.replace(/-/g, "")}`;

  return (
    <a
      href={notionUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-[16px] overflow-hidden bg-white border border-[#F0E8E0] shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all"
    >
      {/* 顶部彩色区：周标签 + 感悟 */}
      <div
        className="relative flex flex-col items-center justify-center gap-2 px-5 text-center"
        style={{ background: color.bg, minHeight: "120px" }}
      >
        {/* 周日期范围 */}
        <span
          className="font-serif italic text-[22px] leading-tight"
          style={{ color: color.text, opacity: 0.9, letterSpacing: "-0.3px" }}
        >
          {entry.dateRange}
        </span>
        {/* 一句话感悟 */}
        {entry.insight && (
          <p className="text-[11px] leading-[1.5] line-clamp-2" style={{ color: color.text, opacity: 0.75 }}>
            {entry.insight}
          </p>
        )}
        {/* 右上角印章 */}
        <div
          className="absolute top-3 right-3 w-[28px] h-[28px] rounded-full border flex flex-col items-center justify-center leading-none"
          style={{ borderColor: color.text, opacity: 0.35 }}
        >
          <span className="text-[6px] font-semibold" style={{ color: color.text }}>Hand</span>
          <span className="text-[6px] font-semibold" style={{ color: color.text }}>Log</span>
        </div>
      </div>

      {/* 内容区：评分 + 标签 */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-[6px] flex-1">
        <div className="flex items-center text-[11px] text-[#8B6B4A]">
          <span className="font-medium text-[#4A3324]">{entry.weekLabel} 周</span>
          {entry.score !== null && (
            <span className="ml-auto">⭐ {entry.score}/10</span>
          )}
        </div>

        {entry.labels.length > 0 && (
          <div className="flex flex-wrap gap-[4px] mt-1">
            {entry.labels.map((label, i) => {
              const tc = TAG_COLORS[i % TAG_COLORS.length];
              return (
                <span
                  key={label}
                  className="rounded-full px-[9px] py-[2px] text-[10px] font-medium"
                  style={{ backgroundColor: tc.bg, color: tc.text }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </a>
  );
}
