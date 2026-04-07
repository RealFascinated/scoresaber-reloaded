"use client";

import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { Slider } from "@/components/ui/slider";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

const GYP_L = 57.74;
const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 86.6;

const DEFAULT_MAX_PASS = 14; // star rating
const DEFAULT_MAX_ACC = 97; // accuracy %
const DEFAULT_MAX_TECH = 0.5; // pp efficiency ratio

interface SkillMetrics {
  pass: number;
  acc: number;
  tech: number;
}

interface TimelineEntry {
  label: string;
  timestamp: number;
  metrics: SkillMetrics;
  scoreCount: number;
}

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "long",
  timeZone: "UTC",
});

function computeSkillMetrics(scores: { stars: number; accuracy: number; pp: number }[]): SkillMetrics | null {
  const ranked = scores.filter(s => s.stars > 0 && s.pp > 0 && s.accuracy > 0);
  if (ranked.length === 0) {
    return null;
  }

  const sorted = ranked.toSorted((a, b) => b.pp - a.pp);
  const topN = sorted.slice(0, 100);

  let totalWeight = 0;
  let weightedStars = 0;
  let weightedAcc = 0;
  let weightedTech = 0;

  for (let i = 0; i < topN.length; i++) {
    const score = topN[i];
    const weight = Math.pow(0.965, i);
    totalWeight += weight;
    weightedStars += score.stars * weight;
    weightedAcc += score.accuracy * weight;
    weightedTech += (score.pp / (score.stars * score.accuracy)) * weight;
  }

  return {
    pass: weightedStars / totalWeight,
    acc: weightedAcc / totalWeight,
    tech: weightedTech / totalWeight,
  };
}

function buildTimeline(
  scores: { stars: number; accuracy: number; pp: number; timestamp: Date }[]
): TimelineEntry[] {
  if (scores.length === 0) {
    return [];
  }

  const ranked = scores.filter(s => s.stars > 0 && s.pp > 0 && s.accuracy > 0);
  if (ranked.length === 0) {
    return [];
  }

  const sorted = ranked.toSorted((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const firstDate = new Date(sorted[0].timestamp);
  const lastDate = new Date(sorted[sorted.length - 1].timestamp);

  const entries: TimelineEntry[] = [];
  const current = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth() + 1, 0));

  while (current <= endMonth) {
    const monthEnd = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0));

    const cumulativeScores = sorted.filter(s => new Date(s.timestamp).getTime() <= monthEnd.getTime());

    const metrics = computeSkillMetrics(cumulativeScores);
    if (metrics) {
      entries.push({
        label: monthFormatter.format(current),
        timestamp: monthEnd.getTime(),
        metrics,
        scoreCount: cumulativeScores.filter(s => s.stars > 0 && s.pp > 0).length,
      });
    }

    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return entries;
}

function normalizeMetrics(metrics: SkillMetrics) {
  const passScale = metrics.pass > DEFAULT_MAX_PASS ? metrics.pass / DEFAULT_MAX_PASS : 1;
  const accScale = metrics.acc > DEFAULT_MAX_ACC ? metrics.acc / DEFAULT_MAX_ACC : 1;
  const techScale = metrics.tech > DEFAULT_MAX_TECH ? metrics.tech / DEFAULT_MAX_TECH : 1;
  const triangleScale = Math.max(passScale, accScale, techScale);

  const maxPass = DEFAULT_MAX_PASS * triangleScale;
  const maxAcc = DEFAULT_MAX_ACC * triangleScale;
  const maxTech = DEFAULT_MAX_TECH * triangleScale;

  const nPass = Math.min(metrics.pass / maxPass, 1);
  const nAcc = Math.min(metrics.acc / maxAcc, 1);
  const nTech = Math.min(metrics.tech / maxTech, 1);

  const totalNormalized = metrics.pass * (maxAcc / maxPass) + metrics.acc + metrics.tech * (maxAcc / maxTech);

  return {
    normalizedPass: nPass,
    normalizedAcc: nAcc,
    normalizedTech: nTech,
    passPart: totalNormalized > 0 ? ((metrics.pass * (maxAcc / maxPass)) / totalNormalized) * 100 : 0,
    accPart: totalNormalized > 0 ? (metrics.acc / totalNormalized) * 100 : 0,
    techPart: totalNormalized > 0 ? ((metrics.tech * (maxAcc / maxTech)) / totalNormalized) * 100 : 0,
  };
}

function cornerOffset(normalized: number) {
  return GYP_L - normalized * GYP_L;
}

function cornerX(offset: number) {
  return offset * 0.866;
}

function cornerY(offset: number) {
  return VIEWBOX_HEIGHT - offset / 2;
}

function computeTriangleCorners(normalizedPass: number, normalizedAcc: number, normalizedTech: number) {
  const techOffset = cornerOffset(normalizedTech);
  const accOffset = cornerOffset(normalizedAcc);

  const corner1 = { x: cornerX(techOffset), y: cornerY(techOffset) };
  const corner2 = { x: VIEWBOX_WIDTH - cornerX(accOffset), y: cornerY(accOffset) };
  const corner3 = { x: 50, y: (VIEWBOX_HEIGHT - GYP_L / 2) * (1 - normalizedPass) };

  return { corner1, corner2, corner3 };
}

function TriangleSVG({
  normalizedPass,
  normalizedAcc,
  normalizedTech,
}: {
  normalizedPass: number;
  normalizedAcc: number;
  normalizedTech: number;
}) {
  const { corner1, corner2, corner3 } = computeTriangleCorners(normalizedPass, normalizedAcc, normalizedTech);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      className="max-h-[300px] max-w-[300px]"
    >
      <g transform={`matrix(1 0 0 -1 0 ${VIEWBOX_HEIGHT})`}>
        <defs>
          <linearGradient
            id="fadeA"
            gradientUnits="userSpaceOnUse"
            x1={corner1.x}
            y1={corner1.y}
            x2={(corner2.x + corner3.x) / 2}
            y2={(corner2.y + corner3.y) / 2}
          >
            <stop offset="0%" stopColor={`rgba(255, 0, 0, ${normalizedTech})`} />
            <stop offset="100%" stopColor={`rgba(255, 0, 0, ${normalizedTech * 0.25})`} />
          </linearGradient>
          <linearGradient
            id="fadeB"
            gradientUnits="userSpaceOnUse"
            x1={corner3.x}
            y1={corner3.y}
            x2={(corner1.x + corner2.x) / 2}
            y2={(corner1.y + corner2.y) / 2}
          >
            <stop offset="0%" stopColor={`rgba(0, 255, 0, ${normalizedPass})`} />
            <stop offset="100%" stopColor={`rgba(0, 255, 0, ${normalizedPass * 0.25})`} />
          </linearGradient>
          <linearGradient
            id="fadeC"
            gradientUnits="userSpaceOnUse"
            x1={corner2.x}
            y1={corner2.y}
            x2={(corner3.x + corner1.x) / 2}
            y2={(corner1.y + corner3.y) / 2}
          >
            <stop offset="0%" stopColor={`rgba(0, 100, 255, ${normalizedAcc})`} />
            <stop offset="100%" stopColor={`rgba(0, 100, 255, ${normalizedAcc * 0.25})`} />
          </linearGradient>
        </defs>

        <g stroke="rgba(255,255,255,0.3)" strokeWidth="0.5">
          <path
            d={`M ${corner3.x},${corner3.y} L ${corner1.x},${corner1.y} ${corner2.x},${corner2.y} Z`}
            fill="url(#fadeA)"
          />
          <path
            d={`M ${corner3.x},${corner3.y} L ${corner1.x},${corner1.y} ${corner2.x},${corner2.y} Z`}
            fill="url(#fadeB)"
          />
          <path
            d={`M ${corner3.x},${corner3.y} L ${corner1.x},${corner1.y} ${corner2.x},${corner2.y} Z`}
            fill="url(#fadeC)"
          />
        </g>

        <g stroke="rgba(255,255,255,0.5)" fill="none" strokeWidth="2" strokeDasharray="4">
          <path d={`M 50,0 L 0,${VIEWBOX_HEIGHT} ${VIEWBOX_WIDTH},${VIEWBOX_HEIGHT} Z`} />
        </g>
      </g>
    </svg>
  );
}

function TimelineSlider({
  timeline,
  selectedIndex,
  onSelect,
}: {
  timeline: TimelineEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  if (timeline.length <= 1) {
    return null;
  }

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-3 md:max-w-[250px] md:gap-2">
      <Slider
        value={[selectedIndex]}
        onValueChange={v => onSelect(v[0])}
        min={0}
        max={timeline.length - 1}
        step={1}
        labelPosition="none"
        className="w-full"
      />
      <div className="scrollbar-none max-h-[min(42vh,220px)] overflow-y-auto overscroll-contain md:max-h-[280px]">
        <div className="flex flex-col gap-0.5 md:gap-0.5">
          {[...timeline].reverse().map((entry, reverseIdx) => {
            const idx = timeline.length - 1 - reverseIdx;
            const isSelected = idx === selectedIndex;
            return (
              <button
                type="button"
                key={entry.timestamp}
                onClick={() => onSelect(idx)}
                className={`cursor-pointer touch-manipulation rounded-md px-3 py-2.5 text-left text-sm transition-colors md:px-2 md:py-0.5 md:text-xs ${
                  isSelected
                    ? "bg-primary/20 text-primary font-semibold"
                    : "text-muted-foreground active:bg-muted/70 hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {idx === timeline.length - 1 ? "Today" : entry.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SkillTriangleChart({ player }: { player: ScoreSaberPlayer }) {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["skill-triangle", player.id],
    queryFn: async () => {
      const response = await ssrApi.getPlayerScoresChart(player.id);
      return response?.data || [];
    },
  });

  const timeline = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return [];
    }
    return buildTimeline(chartData);
  }, [chartData]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const activeIndex = selectedIndex ?? (timeline.length > 0 ? timeline.length - 1 : 0);
  const activeEntry = timeline[activeIndex];
  const metrics = activeEntry?.metrics ?? null;

  const { normalizedPass, normalizedAcc, normalizedTech, passPart, accPart, techPart } = useMemo(() => {
    if (!metrics) {
      return {
        normalizedPass: 0,
        normalizedAcc: 0,
        normalizedTech: 0,
        passPart: 0,
        accPart: 0,
        techPart: 0,
      };
    }
    return normalizeMetrics(metrics);
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="flex min-h-[min(70vh,400px)] items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-muted-foreground text-sm">Computing skill triangle...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center px-4 py-8">
        <p className="text-muted-foreground text-center text-sm">
          Not enough ranked score data for skill triangle
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 overflow-visible px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:gap-6 md:p-6 md:pb-6">
      <div className="flex w-full max-w-lg flex-col-reverse items-stretch gap-6 overflow-visible md:max-w-none md:flex-row md:items-center md:justify-center md:gap-10">
        {timeline.length > 1 && (
          <TimelineSlider timeline={timeline} selectedIndex={activeIndex} onSelect={setSelectedIndex} />
        )}

        <div className="relative mx-auto w-full max-w-[min(100%,320px)] overflow-visible px-1 pt-8 pb-8 md:pt-9 md:pb-9">
          <div className="relative flex w-full items-center justify-center">
            <div className="absolute -top-1 left-0 z-10 flex max-w-[42%] -translate-y-full flex-col items-start gap-0.5 sm:max-w-none md:-left-4 md:items-center">
              <SimpleTooltip
                display={
                  <p>
                    Tech skill ratio (higher means the player extracts more PP relative to map difficulty and
                    accuracy)
                  </p>
                }
                side="top"
                showOnMobile
              >
                <div className="flex flex-col items-start gap-0.5 md:items-center">
                  <span className="text-xs font-semibold text-red-400 sm:text-sm">
                    Tech: {metrics.tech.toFixed(4)}
                  </span>
                  <span className="text-[10px] text-yellow-400 sm:text-xs">({techPart.toFixed(1)}%)</span>
                </div>
              </SimpleTooltip>
            </div>

            <div className="absolute -top-1 right-0 z-10 flex max-w-[42%] -translate-y-full flex-col items-end gap-0.5 sm:max-w-none md:-right-4 md:items-center">
              <SimpleTooltip
                display={<p>Weighted average accuracy across top ranked scores</p>}
                side="top"
                showOnMobile
              >
                <div className="flex flex-col items-end gap-0.5 md:items-center">
                  <span className="text-xs font-semibold text-blue-400 sm:text-sm">
                    Acc: {metrics.acc.toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-yellow-400 sm:text-xs">({accPart.toFixed(1)}%)</span>
                </div>
              </SimpleTooltip>
            </div>

            <div className="absolute -bottom-1 left-1/2 z-10 flex max-w-[90%] -translate-x-1/2 translate-y-full flex-col items-center gap-0.5 px-1 text-center">
              <SimpleTooltip
                display={<p>Weighted average star rating (higher means the player passes harder maps)</p>}
                side="bottom"
                showOnMobile
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-semibold text-green-400 sm:text-sm">
                    Pass: {metrics.pass.toFixed(1)}
                    {"\u2009"}★
                  </span>
                  <span className="text-[10px] text-yellow-400 sm:text-xs">({passPart.toFixed(1)}%)</span>
                </div>
              </SimpleTooltip>
            </div>

            <div className="mx-auto aspect-square w-full max-w-[220px] transition-all duration-500 sm:max-w-[240px] md:h-[280px] md:w-[280px] md:max-w-[280px]">
              <TriangleSVG
                normalizedPass={normalizedPass}
                normalizedAcc={normalizedAcc}
                normalizedTech={normalizedTech}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="text-muted-foreground mt-5 w-full text-center text-xs md:mt-8">
        Based on top {Math.min(100, activeEntry?.scoreCount ?? 0)} ranked scores
        {activeIndex !== timeline.length - 1 && activeEntry ? ` as of ${activeEntry.label}` : ""}
      </div>
    </div>
  );
}
