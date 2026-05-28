"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import type { DayEntry } from "@/lib/timeline";

export default function TimelineContent() {
  const locale = useLocale();
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  // 默认只显示最新一个月，点「查看更多」再展开更多月份
  const [visibleMonths, setVisibleMonths] = useState(1);

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
    return entries.filter((e) => {
      const matchLabel = !activeLabel || e.labels.includes(activeLabel);
      const q = search.toLowerCase();
      const matchSearch = !q || e.dailySummary.toLowerCase().includes(q) || e.insight.toLowerCase().includes(q);
      return matchLabel && matchSearch;
    });
  }, [entries, search, activeLabel]);

  // 按月分组
  const grouped = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const entry of filtered) {
      const [year, month] = entry.date.split("-");
      const key = `${year}年${parseInt(month)}月`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // 搜索或筛选时展开所有月份；否则按 visibleMonths 控制
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
    <div className="max-w-[960px] mx-auto px-6 py-8">

      {/* 页面标题 */}
      <div className="mb-5">
        <h1 className="text-[20px] font-semibold text-[#2C1F14] tracking-tight">Timeline</h1>
        <p className="text-[13px] text-[#8B6B4A] mt-[2px]">每一天的足迹</p>
      </div>

      {/* 搜索框 */}
      <input
        type="text"
        placeholder="搜索日记内容..."
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

      {/* 卡片墙 */}
      {visibleGroups.length === 0 ? (
        <p className="text-center text-[#8B6B4A] py-16 text-[14px]">没有找到匹配的记录</p>
      ) : (
        visibleGroups.map(([month, monthEntries], groupIdx) => (
          <div key={month} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[14px] font-semibold text-[#2C1F14]">{month}</h2>
              <span className="text-[12px] text-[#8B6B4A]">· {monthEntries.length} 条记录</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {monthEntries.map((entry, i) => (
                <DayCard key={entry.date} entry={entry} colorIndex={i} />
              ))}
              {/* 最新那个月的最后加「记录今天」格 */}
              {groupIdx === 0 && (
                <AddTodayCard href={`/${locale}/capture`} />
              )}
            </div>
          </div>
        ))
      )}

      {/* 查看更多按钮 */}
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

// 卡片顶部渐变色，按索引循环
const CARD_COLORS = [
  { bg: "linear-gradient(135deg, #FDF0F0 0%, #F5D8D8 100%)", text: "#B86070" },  // 玫瑰粉
  { bg: "linear-gradient(135deg, #EEF5EE 0%, #D4E8D4 100%)", text: "#5A8A5A" },  // 薄荷绿
  { bg: "linear-gradient(135deg, #F0EEF8 0%, #DDD4F0 100%)", text: "#7A6AB0" },  // 薰衣草紫
  { bg: "linear-gradient(135deg, #FDF4EC 0%, #F0E0C8 100%)", text: "#B87040" },  // 暖米色
  { bg: "linear-gradient(135deg, #EEF2F8 0%, #D4DFF0 100%)", text: "#5A6A98" },  // 天蓝
];

// 标签颜色，按索引循环
const TAG_COLORS = [
  { bg: "#FDE8E8", text: "#C4707A" },
  { bg: "#E8F5E8", text: "#5A9A5A" },
  { bg: "#EDE8F5", text: "#7A6AAA" },
  { bg: "#FFF3E0", text: "#C4783A" },
  { bg: "#E8F0FA", text: "#5A7AB8" },
];

// ── 单日卡片 ─────────────────────────────────────────────────────────────────

function DayCard({ entry, colorIndex }: { entry: DayEntry; colorIndex: number }) {
  const [, month, day] = entry.date.split("-");
  const shortDate = `${parseInt(month)}.${parseInt(day)}`;
  const dateLabel = `${parseInt(month)}月${parseInt(day)}日`;
  const color = CARD_COLORS[colorIndex % CARD_COLORS.length];

  // Notion 页面 URL：去掉 ID 里的连字符拼成标准链接
  const notionUrl = `https://www.notion.so/${entry.weekPageId.replace(/-/g, "")}`;

  return (
    <a href={notionUrl} target="_blank" rel="noopener noreferrer"
      className="rounded-[16px] overflow-hidden bg-white border border-[#F0E8E0] shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all cursor-pointer">

      {/* 彩色顶部区域：日期 + 一句话感悟 */}
      <div className="relative flex flex-col items-center justify-center gap-2 px-5 text-center"
        style={{ background: color.bg, minHeight: "130px" }}>
        {/* 衬线斜体日期 */}
        <span className="font-serif italic" style={{ fontSize: "40px", color: color.text, opacity: 0.85, letterSpacing: "-0.5px", lineHeight: 1 }}>
          {shortDate}
        </span>
        {/* 一句话感悟放在日期下方 */}
        {entry.insight && (
          <p className="text-[11px] leading-[1.5] line-clamp-2" style={{ color: color.text, opacity: 0.75 }}>
            {entry.insight}
          </p>
        )}
        {/* 右上角印章 */}
        <div className="absolute top-3 right-3 w-[32px] h-[32px] rounded-full border flex flex-col items-center justify-center leading-none"
          style={{ borderColor: color.text, opacity: 0.4 }}>
          <span className="text-[7px] font-semibold" style={{ color: color.text }}>Hand</span>
          <span className="text-[7px] font-semibold" style={{ color: color.text }}>Log</span>
        </div>
      </div>

      {/* 内容区 */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-[6px] flex-1">
        {/* 日期 + 星期 + 评分 */}
        <div className="flex items-center text-[11px] text-[#8B6B4A]">
          <span>{dateLabel}（{entry.weekday}）</span>
          {entry.score !== null && (
            <span className="ml-auto">⭐ {entry.score}</span>
          )}
        </div>

        {/* 标签 */}
        {entry.labels.length > 0 && (
          <div className="flex flex-wrap gap-[4px] mt-auto pt-[2px]">
            {entry.labels.map((label, i) => {
              const tc = TAG_COLORS[i % TAG_COLORS.length];
              return (
                <span key={label} className="rounded-full px-[9px] py-[2px] text-[10px] font-medium"
                  style={{ backgroundColor: tc.bg, color: tc.text }}>
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

// ── 记录今天卡片 ─────────────────────────────────────────────────────────────

function AddTodayCard({ href }: { href: string }) {
  return (
    <a href={href}
      className="rounded-[18px] border-2 border-dashed border-[#E4D4C0] flex flex-col items-center justify-center gap-2 min-h-[260px] hover:border-[#C4783A] hover:bg-[#FDF8F3] transition-colors group">
      <span className="text-[32px] text-[#C4A98A] group-hover:text-[#C4783A] transition-colors">+</span>
      <span className="text-[14px] text-[#8B6B4A] group-hover:text-[#2C1F14] transition-colors">记录今天</span>
    </a>
  );
}
