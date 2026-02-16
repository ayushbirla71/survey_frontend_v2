"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OptionMediaDisplay } from "@/app/survey/[id]/page";

type RankingOption = {
  id: string;
  text: string;
};

interface RankingQuestionProps {
  question: any;
  answer: string[];
  onChange: (rankedOptionIds: string[]) => void;
}

export default function RankingQuestion({
  question,
  answer,
  onChange,
}: RankingQuestionProps) {
  /**
   * rankMap:
   * optionId -> rank number (1-based)
   */
  // Initial order = option order
  const {
    id: questionId,
    options,
    allow_partial_rank,
    min_rank_required,
    max_rank_allowed,
  } = question;

  const [rankMap, setRankMap] = useState<Record<string, number>>({});

  const rankedCount = Object.keys(rankMap).length;

  const maxAllowed = allow_partial_rank
    ? Math.min(max_rank_allowed, options.length)
    : options.length;

  // Notify parent whenever ranking changes
  useEffect(() => {
    const ranked = Object.entries(rankMap)
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => id);

    onChange(ranked);
  }, [rankMap, onChange]);

  const handleClick = (optionId: string) => {
    setRankMap((prev) => {
      const next = { ...prev };

      // CASE 1: option already ranked → deselect + re-rank
      if (next[optionId]) {
        const removedRank = next[optionId];
        delete next[optionId];

        // shift ranks down
        Object.keys(next).forEach((id) => {
          if (next[id] > removedRank) {
            next[id] = next[id] - 1;
          }
        });

        return next;
      }

      // CASE 2: option not ranked → assign next rank
      if (rankedCount >= maxAllowed) {
        return prev; // hard stop, max reached
      }

      next[optionId] = rankedCount + 1;
      return next;
    });
  };

  const isValid =
    rankedCount >= min_rank_required &&
    rankedCount <= maxAllowed &&
    (allow_partial_rank || rankedCount === options.length);

  return (
    <div className="space-y-3">
      {options.map((opt: any) => {
        const rank = rankMap[opt.id];

        return (
          <Card
            key={opt.id}
            onClick={() => handleClick(opt.id)}
            className={cn(
              "p-3 cursor-pointer select-none",
              rank ? "border-violet-500 bg-violet-50" : "hover:bg-slate-50",
            )}
          >
            <div className="flex gap-3 items-start">
              {/* Rank badge */}
              <div
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0 mt-1",
                  rank
                    ? "bg-violet-600 text-white"
                    : "border border-dashed text-slate-400",
                )}
              >
                {rank ?? "–"}
              </div>

              {/* 🔧 UPDATED: vertical content */}
              <div className="flex-1 space-y-2">
                {/* Text FIRST */}
                {opt.text && (
                  <div className="text-sm font-medium text-slate-800">
                    {opt.text}
                  </div>
                )}

                {/* Media BELOW text, full width */}
                <OptionMediaDisplay media={opt.mediaAsset} fullWidth={true} />
              </div>
            </div>
          </Card>
        );
      })}

      {/* Validation hint */}
      <div className="text-xs">
        {!isValid ? (
          <p className="text-red-600">
            {allow_partial_rank
              ? `Rank at least ${min_rank_required} and up to ${maxAllowed} options`
              : `You must rank all ${options.length} options`}
          </p>
        ) : (
          <p className="text-slate-500">
            {rankedCount} of {maxAllowed} ranked
          </p>
        )}
      </div>
    </div>
  );
}
