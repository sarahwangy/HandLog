"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import type { DayEntry } from "@/lib/timeline";

export default function TimelineContent() {
  const locale = useLocale();
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

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

  // 所有出现过的标签（去重）
  const allLabels = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.labels.forEach((l) => set.add(l)));
    return Array.from(set);
  }, [entries]);

  // 过滤：搜索 + 标签
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchLabel = !activeLabel || e.labels.includes(activeLabel);
      const q = search.toLowerCase();
      const matchSearch = !q || e.dailySummary.toLowerCase().includes(q) || e.insight.toLowerCase().includes(q);
      return matchLabel && matchSearch;
    });
  }, [entries, search, activeLabel]);

  // 按月分组，格式 "2026年5月"
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

  if (loading) return (
    <div className="min-h-screen bg-[#FDFAF6] flex items-center justify-center">
      <p className="text-[#8B6B4A] text-[15px]">Loading timeline...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#FDFAF6] flex items-center justify-center">
      <p className="text-[#C4783A] text-[14px]">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFAF6]">
      <div className="max-w-[960px] mx-auto px-6 py-8">

        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-[#2C1F14] tracking-tight">Timeline</h1>
          <p className="text-[14px] text-[#8B6B4A] mt-1">每一天的足迹</p>
        </div>

        {/* 搜索框 */}
        <input
          type="text"
          placeholder="搜索日记内容..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-[44px] px-4 rounded-[10px] border border-[#E4D4C0] bg-white text-[14px] text-[#2C1F14] placeholder-[#C4A98A] focus:outline-none focus:border-[#C4783A] mb-4"
        />

        {/* 标签筛选 */}
        {allLabels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-7">
            <button
              type="button"
              onClick={() => setActiveLabel(null)}
              className={`px-3 py-1 rounded-full text-[13px] border transition-colors ${
                !activeLabel ? "bg-[#2C1F14] text-white border-[#2C1F14]" : "bg-white text-[#8B6B4A] border-[#E4D4C0] hover:border-[#C4A98A]"
              }`}
            >
              全部
            </button>
            {allLabels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveLabel(activeLabel === label ? null : label)}
                className={`px-3 py-1 rounded-full text-[13px] border transition-colors ${
                  activeLabel === label ? "bg-[#C4783A] text-white border-[#C4783A]" : "bg-white text-[#8B6B4A] border-[#E4D4C0] hover:border-[#C4A98A]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 按月分组的卡片墙 */}
        {grouped.length === 0 ? (
          <p className="text-center text-[#8B6B4A] py-16">没有找到匹配的记录</p>
        ) : (
          grouped.map(([month, monthEntries]) => (
            <div key={month} className="mb-10">
              {/* 月份标题 */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-[16px] font-semibold text-[#2C1F14]">{month}</h2>
                <span className="text-[13px] text-[#8B6B4A]">· {monthEntries.length} 条记录</span>
              </div>

              {/* 3列卡片网格（手机1列） */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {monthEntries.map((entry) => (
                  <DayCard key={entry.date} entry={entry} />
                ))}
              </div>
            </div>
          ))
        )}

        {/* 右下角「记录今天」按钮 */}
        <Link
          href={`/${locale}/capture`}
          className="fixed bottom-8 right-8 h-[48px] px-6 bg-[#C4783A] text-white rounded-full text-[14px] font-medium shadow-lg hover:bg-[#A85E28] transition-colors flex items-center gap-2"
        >
          + 记录今天
        </Link>
      </div>
    </div>
  );
}

// ── 单日卡片 ─────────────────────────────────────────────────────────────────

function DayCard({ entry }: { entry: DayEntry }) {
  // 从 "2026-05-27" 提取 "5月27日"
  const [, month, day] = entry.date.split("-");
  const dateLabel = `${parseInt(month)}月${parseInt(day)}日`;

  return (
    <div className="rounded-[14px] p-5 bg-[#FDFAF6] border border-[#E4D4C0] shadow-[rgba(80,40,10,0.03)_0_0_0_1px,rgba(80,40,10,0.05)_0_2px_6px] flex flex-col gap-3">

      {/* 日期 + 星期 + 评分 */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[22px] font-bold text-[#2C1F14] leading-none">{dateLabel}</p>
          <p className="text-[12px] text-[#8B6B4A] mt-[3px]">{entry.weekday}</p>
        </div>
        {entry.score !== null && (
          <div className="flex flex-col items-end">
            <span className="text-[20px] font-bold text-[#C4783A] leading-none">{entry.score}</span>
            <span className="text-[10px] text-[#C4A98A]">/10</span>
          </div>
        )}
      </div>

      {/* 日记摘要 */}
      <p className="text-[13px] text-[#4A3324] leading-[1.7] line-clamp-4">{entry.dailySummary}</p>

      {/* 一句话感悟 */}
      {entry.insight && (
        <p className="text-[12px] text-[#8B6B4A] italic border-t border-[#EDE3D8] pt-2 line-clamp-2">
          &ldquo;{entry.insight}&rdquo;
        </p>
      )}

      {/* 标签 */}
      {entry.labels.length > 0 && (
        <div className="flex flex-wrap gap-[5px]">
          {entry.labels.map((label) => (
            <span key={label} className="bg-[#FDF0E6] border border-[#E4D4C0] rounded-full px-2 py-[2px] text-[11px] text-[#4A3324]">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
