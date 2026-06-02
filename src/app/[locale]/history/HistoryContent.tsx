"use client";

import { useState, useEffect } from "react";
import type { HistoryEntry } from "@/app/api/history/route";

// 把 "5-25-31" 解析成可读的日期范围 "5月25日 – 5月31日"
function parseWeekLabel(label: string): string {
  const parts = label.split("-");
  if (parts.length !== 3) return label;
  const [m, d1, d2] = parts;
  return `${m}月${d1}日 – ${m}月${d2}日`;
}

// 把 "5-25-31" 提取出月份，用于分组标题
function getMonthGroup(label: string): string {
  const m = label.split("-")[0];
  return `${m}月`;
}

// 评分对应的颜色
function scoreColor(score: number | null): string {
  if (!score) return "text-[#B89A7A]";
  if (score >= 8) return "text-[#5A8A5A]";
  if (score >= 6) return "text-[#C4783A]";
  return "text-[#AA6666]";
}

// 评分对应的点点
function ScoreDots({ score }: { score: number | null }) {
  if (!score) return <span className="text-[11px] text-[#B89A7A]">未评分</span>;
  return (
    <div className="flex gap-[3px] items-center">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={`w-[6px] h-[6px] rounded-full ${i < score ? "bg-[#C4783A]" : "bg-[#E4D4C0]"}`} />
      ))}
      <span className={`ml-1 text-[12px] font-semibold ${scoreColor(score)}`}>{score}/10</span>
    </div>
  );
}

export default function HistoryContent() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "with-score">("all");

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setEntries(d.entries);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-[#8B6B4A] text-[14px]">正在读取历史记录...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-[#C4783A] text-[14px]">{error}</p>
    </div>
  );

  const filtered = filter === "with-score" ? entries.filter(e => e.score !== null) : entries;

  // 按月分组
  const groups: { month: string; items: HistoryEntry[] }[] = [];
  for (const entry of filtered) {
    const month = getMonthGroup(entry.weekLabel);
    const last = groups[groups.length - 1];
    if (last && last.month === month) {
      last.items.push(entry);
    } else {
      groups.push({ month, items: [entry] });
    }
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-6">

      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#2C1F14]">📋 历史复盘</h1>
        <p className="text-[13px] text-[#8B6B4A] mt-1">点击任意一周，在 Notion 里查看完整复盘内容</p>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-6">
        {(["all", "with-score"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-4 py-[6px] rounded-full text-[13px] font-medium transition-colors
              ${filter === f ? "bg-[#2C1F14] text-white" : "bg-white border border-[#E4D4C0] text-[#8B6B4A] hover:border-[#C4A98A]"}`}>
            {f === "all" ? `全部 (${entries.length})` : `已评分 (${entries.filter(e => e.score !== null).length})`}
          </button>
        ))}
      </div>

      {/* 按月分组列表 */}
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.month}>
            {/* 月份标题 */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[13px] font-bold text-[#8B6B4A]">{group.month}</span>
              <div className="flex-1 h-px bg-[#E4D4C0]" />
              <span className="text-[11px] text-[#B89A7A]">{group.items.length} 周</span>
            </div>

            {/* 周条目卡片 */}
            <div className="flex flex-col gap-2">
              {group.items.map((entry) => (
                <a
                  key={entry.weekLabel}
                  href={entry.notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 bg-white border border-[#E4D4C0] rounded-[12px] px-4 py-3 hover:border-[#C4783A] hover:shadow-sm transition-all group"
                >
                  {/* 周期 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-semibold text-[#2C1F14]">
                        {parseWeekLabel(entry.weekLabel)}
                      </span>
                      {!entry.hasSummary && (
                        <span className="text-[10px] bg-[#F5EDE0] text-[#B89A7A] px-2 py-0.5 rounded-full">空白周</span>
                      )}
                    </div>
                    <ScoreDots score={entry.score} />
                  </div>

                  {/* 标签 */}
                  {entry.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                      {entry.labels.slice(0, 3).map((label) => (
                        <span key={label} className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5EDE0] border border-[#E4D4C0] text-[#8B6B4A]">
                          {label}
                        </span>
                      ))}
                      {entry.labels.length > 3 && (
                        <span className="text-[11px] text-[#B89A7A]">+{entry.labels.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* 箭头 */}
                  <span className="text-[#C4A98A] group-hover:text-[#C4783A] transition-colors text-[16px] flex-shrink-0">→</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[#B89A7A]">
          <div className="text-[36px] mb-3">📭</div>
          <p className="text-[14px]">没有找到记录</p>
        </div>
      )}
    </div>
  );
}
