"use client";

import { useState } from "react";
import type { DailyReview } from "@/lib/claude";

interface ReviewContentProps {
  dateKey: string;
}

export default function ReviewContent({ dateKey }: ReviewContentProps) {
  const [review, setReview] = useState<DailyReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="text-center py-20">
        <h2 className="text-2xl text-[#2C1F14] font-serif mb-3">Ready to reflect?</h2>
        <p className="text-[#8B6B4A] mb-8 text-sm">AI will structure today&apos;s journal into a rich review.</p>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="bg-[#2C1F14] text-[#FAF6F0] px-8 py-3 rounded-xl hover:bg-[#4A3728] transition-colors disabled:opacity-50"
        >
          {loading ? "Generating..." : "✨ Generate my review"}
        </button>
        {/* eslint-disable-next-line react/no-unescaped-entities */}
        {error && <p className="text-[#C4907A] mt-4 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl text-[#2C1F14] font-serif mb-1">Today&apos;s Review</h2>
        <p className="text-[#8B6B4A] text-sm">{dateKey}</p>
      </div>

      {/* One-line insight */}
      <Card emoji="💡" title="One-line insight">
        <p className="text-[#2C1F14] italic font-serif text-lg leading-relaxed">
          &ldquo;{review.oneLineInsight}&rdquo;
        </p>
      </Card>

      {/* Dynamic sections — only show if content exists */}
      {review.people.length > 0 && <ListCard emoji="👥" title="People" items={review.people} />}
      {review.places.length > 0 && <ListCard emoji="📍" title="Places" items={review.places} />}
      {review.events.length > 0 && <ListCard emoji="📅" title="Events" items={review.events} />}
      {review.books.length > 0 && <ListCard emoji="📚" title="Books" items={review.books} />}
      {review.mediaConsumed.length > 0 && <ListCard emoji="🎙" title="Podcasts & Articles" items={review.mediaConsumed} />}
      {review.moviesTV.length > 0 && <ListCard emoji="🎬" title="Movies & TV" items={review.moviesTV} />}
      {review.parenting.length > 0 && <ListCard emoji="👶" title="Parenting" items={review.parenting} />}
      {review.health.length > 0 && <ListCard emoji="💪" title="Health & Body" items={review.health} />}
      {review.finance.length > 0 && <ListCard emoji="💰" title="Finance" items={review.finance} />}
      {review.learning.length > 0 && <ListCard emoji="🧠" title="Learning" items={review.learning} />}
      {review.creativeOutput.length > 0 && <ListCard emoji="✍️" title="Creative Output" items={review.creativeOutput} />}
      {review.emotions.length > 0 && <ListCard emoji="🌊" title="Emotions" items={review.emotions} />}

      {/* Review paragraph */}
      <Card emoji="🪞" title="Today's reflection">
        <p className="text-[#2C1F14] text-sm leading-relaxed">{review.reviewParagraph}</p>
      </Card>

      {/* Next steps */}
      {review.nextSteps.length > 0 && (
        <Card emoji="🎯" title="Next steps">
          <ul className="space-y-2">
            {review.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#2C1F14]">
                <span className="mt-0.5 w-4 h-4 border border-[#8B6B4A] rounded flex-shrink-0" />
                {step}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Energy distribution */}
      {Object.keys(review.energyDistribution).length > 0 && (
        <Card emoji="⚡" title="Energy distribution">
          <div className="space-y-2">
            {Object.entries(review.energyDistribution).map(([label, pct]) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-[#8B6B4A] mb-1">
                  <span>{label}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-[#E8D9C4] rounded-full">
                  <div
                    className="h-1.5 bg-[#8B6B4A] rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Progress zones */}
      {(review.progressZones.breakthrough || review.progressZones.inPractice || review.progressZones.plantedSeed) && (
        <Card emoji="🌱" title="Progress zones">
          <div className="space-y-2 text-sm">
            {review.progressZones.breakthrough && (
              <p><span className="text-green-600">🟢 Breakthrough:</span> <span className="text-[#2C1F14]">{review.progressZones.breakthrough}</span></p>
            )}
            {review.progressZones.inPractice && (
              <p><span className="text-yellow-600">🟡 In practice:</span> <span className="text-[#2C1F14]">{review.progressZones.inPractice}</span></p>
            )}
            {review.progressZones.plantedSeed && (
              <p><span className="text-blue-500">🔵 Planted seed:</span> <span className="text-[#2C1F14]">{review.progressZones.plantedSeed}</span></p>
            )}
          </div>
        </Card>
      )}

      {/* Score */}
      <Card emoji="⭐" title="Today's score">
        <div className="flex items-center gap-4">
          <span className="text-4xl font-serif text-[#2C1F14]">{review.score}</span>
          <span className="text-[#8B6B4A] text-4xl">/10</span>
          <p className="text-sm text-[#8B6B4A] flex-1">{review.scoreReason}</p>
        </div>
        <div className="flex gap-1 mt-3">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${i < review.score ? "bg-[#C4A962]" : "bg-[#E8D9C4]"}`}
            />
          ))}
        </div>
      </Card>

      {/* Psychology note */}
      {review.psychNote && (
        <Card emoji="🧘" title="A note for you">
          <p className="text-sm text-[#8B6B4A] leading-relaxed italic">{review.psychNote}</p>
        </Card>
      )}

      {/* Submit button */}
      <button
        type="button"
        className="w-full bg-[#2C1F14] text-[#FAF6F0] rounded-xl py-4 text-base hover:bg-[#4A3728] transition-colors mt-4"
      >
        ✨ Generate HandLog image →
      </button>
    </div>
  );
}

// ── Shared card components ───────────────────────────────────────────────────

function Card({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-[rgba(139,107,74,0.2)] shadow-sm">
      <h3 className="text-[#8B6B4A] text-sm font-medium mb-3">{emoji} {title}</h3>
      {children}
    </div>
  );
}

function ListCard({ emoji, title, items }: { emoji: string; title: string; items: string[] }) {
  return (
    <Card emoji={emoji} title={title}>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-[#2C1F14] pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-[#C4907A]">
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}
