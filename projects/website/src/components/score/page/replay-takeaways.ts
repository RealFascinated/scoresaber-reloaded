import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { formatTime } from "@ssr/common/utils/time-utils";
import { CutDetail, CutDirection, GridCellSummary, ReplayInsights } from "./replay-insights";

export type Takeaway = {
  tone: "good" | "improve";
  title: string;
  detail: string;
};

export const DIRECTION_NAMES: Record<CutDirection, string> = {
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  upLeft: "Up-left",
  upRight: "Up-right",
  downLeft: "Down-left",
  downRight: "Down-right",
  dot: "Dot",
};

const LAYER_NAMES = ["bottom", "middle", "top"];
const LANE_NAMES = ["far-left", "middle-left", "middle-right", "far-right"];

export function describeGridCell(cell: GridCellSummary): string {
  return `${LAYER_NAMES[cell.layer]} row, ${LANE_NAMES[cell.lane]} column`;
}

const MAX_GOOD = 4;
const MAX_IMPROVE = 6;
const MAX_WEAK_SPOTS = 3;
const MIN_HITS_PER_GROUP = 20;
/** A gap below this (seconds) between two notes on the same hand leaves little time to prepare. */
const QUICK_GAP = 0.3;
/** A hit scoring below this (out of 115) is a clearly bad hit. */
const BAD_HIT_SCORE = 105;
/** A group must lose this share of the part maximum per hit, and be worth this much accuracy (%). */
const MIN_RELATIVE_DEFICIT = 0.03;
const MIN_GAIN = 0.02;
const MAX_CUT = 115;
/** Accuracy (%) from which scores are very hard to improve further. */
const ELITE_ACCURACY = 98;

function clock(seconds: number): string {
  return formatTime(Math.floor(seconds));
}

/**
 * Turns the replay numbers into a short list of plain-language conclusions.
 */
export function buildTakeaways(insights: ReplayInsights, score: ScoreSaberScore): Takeaway[] {
  const good: Takeaway[] = [];
  const improve: Takeaway[] = [];
  const { loss, totalNotes, avgScore } = insights;

  // How the run went
  if (score.fullCombo && score.misses === 0 && score.badCuts === 0) {
    good.push({
      tone: "good",
      title: "Clean run",
      detail: "You cut every note without a miss or a bad cut.",
    });
  }

  const change = score.previousScore?.change;
  if (change && Math.abs(change.accuracy) >= 0.005) {
    const parts = [`${change.accuracy > 0 ? "+" : "-"}${Math.abs(change.accuracy).toFixed(2)}% accuracy`];
    if (change.pp !== undefined && Math.abs(change.pp) >= 0.005) {
      parts.push(`${change.pp > 0 ? "+" : "-"}${formatPp(Math.abs(change.pp))}pp`);
    }
    (change.accuracy > 0 ? good : improve).push({
      tone: change.accuracy > 0 ? "good" : "improve",
      title: change.accuracy > 0 ? "Better than your last score" : "Lower than your last score",
      detail: `${parts.join(", ")} compared to your previous play on this map.`,
    });
  }

  if (insights.greatShare >= 0.6) {
    good.push({
      tone: "good",
      title: `${Math.round(insights.greatShare * 100)}% of your hits were great`,
      detail: `Great means 110 or more out of 115 points. ${formatNumberWithCommas(insights.perfectCuts)} hits were a perfect 115.`,
    });
  }

  const { great } = insights.streaks;
  if (great.length >= 20) {
    good.push({
      tone: "good",
      title: `${great.length} great hits in a row`,
      detail: `Your hottest streak was from ${clock(great.start)} to ${clock(great.end)}.`,
    });
  }

  const bestSection = [...insights.sections]
    .filter(section => section.notes >= 10)
    .sort((a, b) => b.avgScore - a.avgScore)[0];
  if (bestSection && bestSection.avgScore - avgScore >= 0.7) {
    good.push({
      tone: "good",
      title: "Strongest section",
      detail: `${clock(bestSection.start)} to ${clock(bestSection.end)} averaged ${bestSection.avgScore.toFixed(1)} points per hit, against ${avgScore.toFixed(1)} overall.`,
    });
  }

  // Where the points went. Every normal note is worth up to 115: 70 for the swing before the cut,
  // 30 for the swing after it and 15 for how central the cut was.
  const accuracy = Number.isFinite(score.accuracy) ? score.accuracy : (avgScore / MAX_CUT) * 100;
  if (accuracy >= ELITE_ACCURACY) {
    good.push({
      tone: "good",
      title: `${accuracy.toFixed(2)}% accuracy is elite`,
      detail: "Scores above 98% are extremely hard to reach, so every remaining point is a very small gain.",
    });
  }

  const noteScore = totalNotes * MAX_CUT;
  const accuracyOf = (points: number): number => (noteScore > 0 ? (points / noteScore) * 100 : 0);

  const headline = describeMainLeak(insights, accuracyOf);
  if (headline) {
    improve.push(headline);
  }

  const mistakeCount = score.misses + score.badCuts;
  if (mistakeCount > 0 && loss.missedOrBad > 0) {
    improve.push({
      tone: "improve",
      title: `${mistakeCount} note${mistakeCount === 1 ? "" : "s"} scored nothing`,
      detail: `${score.misses} miss${score.misses === 1 ? "" : "es"}, ${score.badCuts} bad cut${score.badCuts === 1 ? "" : "s"}: ${accuracyOf(loss.missedOrBad).toFixed(2)}% accuracy, plus a broken combo and a lower multiplier.`,
    });
  }

  const concentrated = describeConcentration(insights);
  if (concentrated) {
    improve.push(concentrated);
  }

  improve.push(...findWeakSpots(insights, accuracyOf).slice(0, MAX_WEAK_SPOTS));

  const quiet = insights.density[0];
  const busy = insights.density[insights.density.length - 1];
  if (quiet && busy && insights.density.length > 1 && busy.lostPer100Notes >= quiet.lostPer100Notes * 1.15) {
    improve.push({
      tone: "improve",
      title: "Busy sections cost you more",
      detail: `In the busiest parts of the map you lost ${Math.round(busy.lostPer100Notes)} points per 100 notes, against ${Math.round(quiet.lostPer100Notes)} in the quietest parts.`,
    });
  }

  const firstSection = insights.sections[0];
  if (firstSection && firstSection.notes >= 10 && avgScore - firstSection.avgScore >= 1.5) {
    improve.push({
      tone: "improve",
      title: "Slow start",
      detail: `The first ${Math.round(firstSection.end - firstSection.start)} seconds averaged ${firstSection.avgScore.toFixed(1)} per hit, against ${avgScore.toFixed(1)} for the whole song.`,
    });
  }

  const roughest = insights.weakMoments[0];
  if (roughest) {
    improve.push({
      tone: "improve",
      title: "Roughest moment",
      detail: `Between ${clock(roughest.start)} and ${clock(roughest.end)} you lost ${Math.round(roughest.pointsLost)} points${roughest.misses > 0 ? ` and had ${roughest.misses} miss${roughest.misses === 1 ? "" : "es"}` : ""}.`,
    });
  }

  const pauses = score.beatLeaderScore?.pauses ?? 0;
  if (pauses > 0) {
    improve.push({
      tone: "improve",
      title: `Paused ${pauses} time${pauses === 1 ? "" : "s"}`,
      detail: "Pausing is marked on the timeline above.",
    });
  }

  return [...good.slice(0, MAX_GOOD), ...improve.slice(0, MAX_IMPROVE)];
}

type Part = "preSwing" | "postSwing" | "center";

const PARTS: Record<Part, { max: number; name: string; short: string; rule: string; fix: string }> = {
  preSwing: {
    max: 70,
    name: "the swing before the hit",
    short: "swing before the hit",
    rule: "Pre-swing is worth up to 70 points and is full at about 100° of saber travel before the cut.",
    fix: "Bring the saber back further before the note.",
  },
  postSwing: {
    max: 30,
    name: "following through",
    short: "follow-through",
    rule: "Follow-through is worth up to 30 points and is full at about 60° of saber travel after the cut.",
    fix: "Keep swinging through the block instead of stopping at it.",
  },
  center: {
    max: 15,
    name: "hitting the middle of the block",
    short: "center accuracy",
    rule: "Center is worth 15 for a dead-center cut and drops to 0 about 30 cm from the middle.",
    fix: "Aim for the middle of the block, not just any part of it.",
  },
};
const PART_KEYS = Object.keys(PARTS) as Part[];

function share(details: CutDetail[], part: Part, atLeast = 0.99): number {
  if (details.length === 0) {
    return 0;
  }
  return details.filter(detail => detail[part] >= PARTS[part].max * atLeast).length / details.length;
}

/**
 * Says which part of the score is costing the most, and whether swing length is even the problem.
 */
function describeMainLeak(
  insights: ReplayInsights,
  accuracyOf: (points: number) => number
): Takeaway | undefined {
  const { loss, details, partAverages } = insights;
  const swingLoss = loss.preSwing + loss.postSwing + loss.center;
  if (swingLoss <= 0 || details.length === 0) {
    return undefined;
  }

  const ranked = [...PART_KEYS].sort((a, b) => loss[b] - loss[a]);
  const main = ranked[0];
  const mainShare = loss[main] / swingLoss;
  const average = (part: Part): string => `${partAverages[part].toFixed(1)}/${PARTS[part].max}`;
  const fullShare = (part: Part): number => Math.round(share(details, part) * 100);

  if (mainShare < 0.6) {
    return {
      tone: "improve",
      title: "Your points are lost in several places",
      detail: ranked
        .map(part => `${PARTS[part].short} ${average(part)} (${accuracyOf(loss[part]).toFixed(2)}%)`)
        .join(", "),
    };
  }

  const others = ranked.slice(1);
  const swingsMaxed = main === "center" && others.every(part => share(details, part, 0.95) >= 0.85);
  return {
    tone: "improve",
    title: swingsMaxed ? "Only center accuracy is costing you" : `Most of your loss is ${PARTS[main].short}`,
    detail: swingsMaxed
      ? `Center ${average(main)} costs ${accuracyOf(loss[main]).toFixed(2)}% accuracy. Your swings are already full: ${fullShare("preSwing")}% of hits had a full pre-swing, ${fullShare("postSwing")}% a full follow-through.`
      : `${PARTS[main].short} ${average(main)} costs ${accuracyOf(loss[main]).toFixed(2)}% accuracy. ${PARTS[main].rule}`,
  };
}

/**
 * Checks whether the lost points come from a few bad hits or are spread thinly over many.
 */
function describeConcentration(insights: ReplayInsights): Takeaway | undefined {
  const { details } = insights;
  const totalLost = details.reduce((sum, detail) => sum + (MAX_CUT - detail.score), 0);
  if (details.length < 50 || totalLost <= 0) {
    return undefined;
  }

  const bad = details.filter(detail => detail.score < BAD_HIT_SCORE);
  const badLost = bad.reduce((sum, detail) => sum + (MAX_CUT - detail.score), 0);
  const badShare = badLost / totalLost;
  if (bad.length === 0 || badShare < 0.25) {
    return undefined;
  }

  return {
    tone: "improve",
    title: "A few bad hits cost the most",
    detail: `${bad.length} hit${bad.length === 1 ? "" : "s"} under ${BAD_HIT_SCORE} points make up ${Math.round(badShare * 100)}% of the points lost on hits.`,
  };
}

type Group = { dimension: string; name: string; details: CutDetail[]; note?: string };

function buildGroups(insights: ReplayInsights): Group[] {
  const { details } = insights;
  const groups: Group[] = [];

  for (const hand of ["left", "right"] as const) {
    groups.push({
      dimension: "hand",
      name: `Your ${hand} hand`,
      details: details.filter(detail => detail.hand === hand),
    });
  }

  for (const direction of Object.keys(DIRECTION_NAMES) as CutDirection[]) {
    if (direction !== "dot") {
      groups.push({
        dimension: "direction",
        name: `${DIRECTION_NAMES[direction]} cuts`,
        details: details.filter(detail => detail.direction === direction),
      });
    }
  }

  for (const cell of insights.grid) {
    groups.push({
      dimension: "position",
      name: `Blocks in the ${describeGridCell(cell)}`,
      details: details.filter(detail => detail.lane === cell.lane && detail.layer === cell.layer),
    });
  }

  groups.push({
    dimension: "tempo",
    name: `Notes less than ${QUICK_GAP}s after your last hit with that hand`,
    details: details.filter(detail => detail.gap !== undefined && detail.gap < QUICK_GAP),
    note: "Less time to line up the saber.",
  });

  return groups;
}

/**
 * Finds the kinds of notes (hand, direction, grid spot, tempo) that score worse than the rest of
 * your hits on one part of the score, ranked by how much accuracy matching your other hits would give.
 */
function findWeakSpots(insights: ReplayInsights, accuracyOf: (points: number) => number): Takeaway[] {
  const { details } = insights;
  if (details.length < MIN_HITS_PER_GROUP * 2) {
    return [];
  }

  const totals: Record<Part, number> = { preSwing: 0, postSwing: 0, center: 0 };
  for (const detail of details) {
    for (const part of PART_KEYS) {
      totals[part] += detail[part];
    }
  }

  type Candidate = { dimension: string; gain: number; takeaway: Takeaway };
  const candidates: Candidate[] = [];

  for (const group of buildGroups(insights)) {
    const count = group.details.length;
    const restCount = details.length - count;
    if (count < MIN_HITS_PER_GROUP || restCount < MIN_HITS_PER_GROUP) {
      continue;
    }

    for (const part of PART_KEYS) {
      const groupMean = group.details.reduce((sum, detail) => sum + detail[part], 0) / count;
      const restMean = (totals[part] - groupMean * count) / restCount;
      const deficit = restMean - groupMean;
      const gain = accuracyOf(deficit * count);
      if (deficit / PARTS[part].max < MIN_RELATIVE_DEFICIT || gain < MIN_GAIN) {
        continue;
      }

      const { max, short } = PARTS[part];
      candidates.push({
        dimension: group.dimension,
        gain,
        takeaway: {
          tone: "improve",
          title: `${group.name}: weaker ${short}`,
          detail: `${groupMean.toFixed(1)}/${max} over ${count} hits vs ${restMean.toFixed(1)}/${max} elsewhere, worth about ${gain.toFixed(2)}% accuracy.${group.note ? ` ${group.note}` : ""}`,
        },
      });
    }
  }

  // Best finding per kind of note, so the list isn't five versions of the same problem
  const best = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const current = best.get(candidate.dimension);
    if (!current || candidate.gain > current.gain) {
      best.set(candidate.dimension, candidate);
    }
  }
  return [...best.values()].sort((a, b) => b.gain - a.gain).map(candidate => candidate.takeaway);
}
