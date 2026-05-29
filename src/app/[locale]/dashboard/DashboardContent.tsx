"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { DashboardData } from "@/lib/dashboard";

// Autumn 配色 — 和整体设计系统一致
const COLORS = ["#C4783A", "#8B6B4A", "#D4A574", "#6B8F5E", "#C4A98A", "#A85E28", "#B89A7A", "#4A3324"];

export default function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#F5EDE0] rounded-[14px] h-[160px]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-[#C4783A] text-[15px]">{error}</p>
        <p className="text-[#8B6B4A] text-[13px] mt-2">Connect Notion to see your journal stats.</p>
      </div>
    );
  }

  if (!data) return null;

  // 折线图的 X 轴只显示月/日，不显示年份
  const formatDate = (d: string) => {
    const [, m, day] = d.split("-");
    return `${parseInt(m)}/${parseInt(day)}`;
  };

  return (
    <div className="space-y-4">

      {/* ── 顶部统计卡片（手机 3 列但更紧凑） ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="Total entries" value={String(data.totalEntries)} sub="journal days recorded" />
        <StatCard label="Average score" value={String(data.avgScore)} sub="out of 10" accent />
        <StatCard label="Current streak" value={`${data.currentStreak}d`} sub="consecutive days" />
      </div>

      {/* ── 分数趋势折线图 ── */}
      <DCard title="📈 Score trend" subtitle="Last 30 entries" full>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.scoreTrend} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDE3D8" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: "#8B6B4A" }}
              tickLine={false}
              axisLine={{ stroke: "#E4D4C0" }}
              interval={4}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fontSize: 11, fill: "#8B6B4A" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#FDFAF6",
                border: "1px solid #E4D4C0",
                borderRadius: 8,
                fontSize: 13,
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${v}/10`, "Score"]}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(d: any) => formatDate(d)}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#C4783A"
              strokeWidth={2}
              dot={{ fill: "#C4783A", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </DCard>

      {/* ── 标签频率 + 饼图（手机单列，桌面并排） ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <DCard title="🏷 Top labels" subtitle="Most frequent tags">
          <div className="space-y-[10px] mt-2">
            {data.labelFrequency.slice(0, 6).map((item, i) => (
              <div key={item.label}>
                <div className="flex justify-between text-[13px] mb-[4px]">
                  <span className="text-[#4A3324] font-medium">{item.label}</span>
                  <span className="text-[#8B6B4A]">{item.count}x</span>
                </div>
                <div className="h-[5px] bg-[#F5EDE0] rounded-full">
                  <div
                    className="h-[5px] rounded-full"
                    style={{
                      width: `${Math.round((item.count / (data.labelFrequency[0]?.count || 1)) * 100)}%`,
                      background: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </DCard>

        <DCard title="🥧 Label distribution" subtitle="Proportion by tag">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.labelFrequency.slice(0, 6)}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={40}
                paddingAngle={3}
              >
                {data.labelFrequency.slice(0, 6).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span style={{ fontSize: 12, color: "#4A3324" }}>{v}</span>}
              />
              <Tooltip
                contentStyle={{
                  background: "#FDFAF6",
                  border: "1px solid #E4D4C0",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </DCard>

      </div>

      {/* ── 最近条目列表 ── */}
      <DCard title="📋 Recent entries" subtitle="Latest journal days" full>
        <div className="divide-y divide-[#EDE3D8] mt-1">
          {data.entries.slice(-7).reverse().map(entry => (
            <div key={entry.date} className="flex items-center gap-4 py-[10px]">
              <span className="text-[13px] text-[#8B6B4A] w-[90px] flex-shrink-0">{entry.date}</span>
              <div className="flex gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className={`w-[8px] h-[8px] rounded-full ${i < entry.score ? "bg-[#C4783A]" : "bg-[#E4D4C0]"}`} />
                ))}
              </div>
              <span className="text-[13px] font-medium text-[#2C1F14] w-[28px]">{entry.score}/10</span>
              <div className="flex gap-1 flex-wrap flex-1">
                {entry.labels.slice(0, 3).map(l => (
                  <span key={l} className="bg-[#FDF0E6] border border-[#E4D4C0] rounded-full px-2 py-[2px] text-[11px] text-[#4A3324]">
                    {l}
                  </span>
                ))}
              </div>
              <p className="text-[13px] text-[#8B6B4A] flex-1 truncate hidden md:block">{entry.insight}</p>
            </div>
          ))}
        </div>
      </DCard>

    </div>
  );
}

// ── 共用卡片组件 ──────────────────────────────────────────────────────────────

function DCard({ title, subtitle, children, full }: {
  title: string; subtitle: string; children: React.ReactNode; full?: boolean;
}) {
  return (
    <div className={`bg-[#FDFAF6] rounded-[14px] p-5 border border-[#E4D4C0]
      shadow-[rgba(80,40,10,0.03)_0_0_0_1px,rgba(80,40,10,0.05)_0_2px_6px,rgba(80,40,10,0.08)_0_4px_12px]
      ${full ? "sm:col-span-2" : ""}`}>
      <div className="flex items-baseline gap-2 mb-4">
        <h3 className="text-[15px] font-semibold text-[#2C1F14]">{title}</h3>
        <span className="text-[12px] text-[#8B6B4A]">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <div className="bg-[#FDFAF6] rounded-[14px] p-3 sm:p-5 border border-[#E4D4C0]
      shadow-[rgba(80,40,10,0.03)_0_0_0_1px,rgba(80,40,10,0.05)_0_2px_6px,rgba(80,40,10,0.08)_0_4px_12px]">
      <p className="text-[10px] sm:text-[11px] font-bold text-[#8B6B4A] uppercase tracking-[0.6px] mb-1 sm:mb-2">{label}</p>
      <p className={`text-[28px] sm:text-[40px] font-bold leading-none ${accent ? "text-[#C4783A]" : "text-[#2C1F14]"}`}>
        {value}
      </p>
      <p className="text-[11px] sm:text-[13px] text-[#8B6B4A] mt-1">{sub}</p>
    </div>
  );
}
