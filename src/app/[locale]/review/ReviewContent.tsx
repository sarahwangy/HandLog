"use client";

import { useState } from "react";
import type { DailyReview } from "@/lib/claude";
import type { HandLogStyle } from "@/lib/handlog/templates";

interface ReviewContentProps {
  dateKey: string;
}

export default function ReviewContent({ dateKey }: ReviewContentProps) {
  const [review, setReview] = useState<DailyReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgStyle, setImgStyle] = useState<HandLogStyle>("minimal");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

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

  if (!review) {
    return (
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
    );
  }

  return (
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
          <Label>💡 One-line insight</Label>
          <p className="text-[20px] font-semibold text-[#2C1F14] italic leading-relaxed">
            &ldquo;{review.oneLineInsight}&rdquo;
          </p>
        </RCard>

        {/* Dynamic tag sections */}
        {review.people.length > 0 && <RCard><Label>👥 People</Label><TagList items={review.people} /></RCard>}
        {review.emotions.length > 0 && <RCard><Label>🌊 Emotions</Label><TagList items={review.emotions} /></RCard>}
        {review.events.length > 0 && <RCard><Label>📅 Events</Label><TagList items={review.events} /></RCard>}
        {review.learning.length > 0 && <RCard><Label>🧠 Learning</Label><TagList items={review.learning} /></RCard>}
        {review.health.length > 0 && <RCard><Label>💪 Health & Body</Label><TagList items={review.health} /></RCard>}
        {review.places.length > 0 && <RCard><Label>📍 Places</Label><TagList items={review.places} /></RCard>}
        {review.books.length > 0 && <RCard><Label>📚 Books</Label><TagList items={review.books} /></RCard>}
        {review.mediaConsumed.length > 0 && <RCard><Label>🎙 Podcasts & Articles</Label><TagList items={review.mediaConsumed} /></RCard>}
        {review.moviesTV.length > 0 && <RCard><Label>🎬 Movies & TV</Label><TagList items={review.moviesTV} /></RCard>}
        {review.parenting.length > 0 && <RCard><Label>👶 Parenting</Label><TagList items={review.parenting} /></RCard>}
        {review.finance.length > 0 && <RCard><Label>💰 Finance</Label><TagList items={review.finance} /></RCard>}
        {review.creativeOutput.length > 0 && <RCard><Label>✍️ Creative Output</Label><TagList items={review.creativeOutput} /></RCard>}

        {/* Score */}
        <RCard>
          <Label>⭐ Score</Label>
          <div className="text-[52px] font-bold text-[#2C1F14] leading-none">{review.score}</div>
          <div className="text-[13px] text-[#8B6B4A] mt-1">/10 · {review.scoreReason}</div>
          <div className="flex gap-[5px] mt-3">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className={`w-[10px] h-[10px] rounded-full ${i < review.score ? "bg-[#C4783A]" : "bg-[#E4D4C0]"}`} />
            ))}
          </div>
        </RCard>

        {/* Energy distribution */}
        {Object.keys(review.energyDistribution).length > 0 && (
          <RCard>
            <Label>⚡ Energy distribution</Label>
            <div className="space-y-[10px]">
              {Object.entries(review.energyDistribution).map(([label, pct]) => (
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
        {(review.progressZones.breakthrough || review.progressZones.inPractice || review.progressZones.plantedSeed) && (
          <RCard>
            <Label>🌱 Progress zones</Label>
            <div className="space-y-[10px]">
              {review.progressZones.breakthrough && (
                <p className="text-[14px] text-[#4A3324]">🟢 <strong className="text-[#2C1F14]">Breakthrough:</strong> {review.progressZones.breakthrough}</p>
              )}
              {review.progressZones.inPractice && (
                <p className="text-[14px] text-[#4A3324]">🟡 <strong className="text-[#2C1F14]">In practice:</strong> {review.progressZones.inPractice}</p>
              )}
              {review.progressZones.plantedSeed && (
                <p className="text-[14px] text-[#4A3324]">🔵 <strong className="text-[#2C1F14]">Planted seed:</strong> {review.progressZones.plantedSeed}</p>
              )}
            </div>
          </RCard>
        )}

        {/* Next steps — full width */}
        {review.nextSteps.length > 0 && (
          <RCard full>
            <Label>🎯 Next steps</Label>
            <div className="divide-y divide-[#EDE3D8]">
              {review.nextSteps.map((step, i) => (
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
          <Label>🪞 Today&apos;s reflection</Label>
          <p className="text-[15px] text-[#4A3324] leading-[1.8]">{review.reviewParagraph}</p>
        </RCard>

        {/* Psych note — full width, warm bg */}
        {review.psychNote && (
          <RCard full warm>
            <Label>🧘 A note for you</Label>
            <p className="text-[14px] text-[#8B6B4A] leading-[1.8] italic">{review.psychNote}</p>
          </RCard>
        )}

        {/* HandLog image — full width */}
        <RCard full>
          <Label>🖼 HandLog Image</Label>
          <HandLogSection
            review={review}
            style={imgStyle} setStyle={setImgStyle}
            imgUrl={imgUrl} setImgUrl={setImgUrl}
            loading={imgLoading} setLoading={setImgLoading}
          />
        </RCard>

      </div>
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-[#8B6B4A] uppercase tracking-[0.6px] mb-[10px]">
      {children}
    </p>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-[6px]">
      {items.map((item, i) => (
        <span key={i} className="bg-[#FDF0E6] border border-[#E4D4C0] rounded-full px-3 py-1 text-[13px] text-[#4A3324]">
          {item}
        </span>
      ))}
    </div>
  );
}

// ── HandLog image section ─────────────────────────────────────────────────────

interface HandLogSectionProps {
  review: DailyReview;
  style: HandLogStyle; setStyle: (s: HandLogStyle) => void;
  imgUrl: string | null; setImgUrl: (u: string | null) => void;
  loading: boolean; setLoading: (v: boolean) => void;
}

function HandLogSection({ review, style, setStyle, imgUrl, setImgUrl, loading, setLoading }: HandLogSectionProps) {
  const [error, setError] = useState<string | null>(null);

  const STYLES: { value: HandLogStyle; label: string; emoji: string }[] = [
    { value: "minimal", label: "Minimal", emoji: "🪶" },
    { value: "cute",    label: "Cute",    emoji: "🌸" },
    { value: "vintage", label: "Vintage", emoji: "📜" },
  ];

  const generate = async (s: HandLogStyle) => {
    setLoading(true); setError(null);
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(null);
    try {
      const res = await fetch("/api/handlog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review, style: s }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Generation failed"); }
      setImgUrl(URL.createObjectURL(await res.blob()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const handleStyleChange = (s: HandLogStyle) => {
    setStyle(s);
    if (imgUrl || loading) generate(s);
  };

  return (
    <div>
      {/* Style tabs */}
      <div className="flex gap-2 mb-4">
        {STYLES.map((s) => (
          <button key={s.value} type="button" onClick={() => handleStyleChange(s.value)}
            className={`flex-1 h-[40px] rounded-[8px] text-[13px] font-medium transition-colors border
              ${style === s.value ? "bg-[#2C1F14] text-white border-[#2C1F14]" : "bg-white text-[#8B6B4A] border-[#E4D4C0] hover:border-[#C4A98A] hover:text-[#2C1F14]"}`}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {imgUrl ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt="HandLog" className="w-full rounded-[14px] border border-[#E4D4C0]" />
          <div className="flex gap-2">
            <button type="button" onClick={() => { const a = document.createElement("a"); a.href = imgUrl; a.download = `handlog-${review.date}.png`; a.click(); }}
              className="flex-1 h-[44px] bg-white text-[#2C1F14] border border-[#C4A98A] rounded-[8px] text-[14px] font-medium hover:bg-[#FAF5EE] transition-colors">
              ⬇ Download PNG
            </button>
            <button type="button" onClick={() => generate(style)} disabled={loading}
              className="flex-1 h-[44px] bg-[#C4783A] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#A85E28] transition-colors disabled:opacity-50">
              {loading ? "Generating..." : "↺ Regenerate"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => generate(style)} disabled={loading}
          className="w-full h-[48px] bg-[#C4783A] text-white rounded-[8px] text-[15px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed">
          {loading ? "Generating..." : "✨ Generate HandLog image →"}
        </button>
      )}
      {error && <p className="text-[#C4783A] mt-3 text-[13px]">{error}</p>}
    </div>
  );
}
