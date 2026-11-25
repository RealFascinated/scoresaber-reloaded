import { formatTime } from "../utils/time-utils";
import { CutDetail, CutDirection, Hand, ReplayInsights } from "./replay-insights";
import { DIRECTION_NAMES, Part, PART_KEYS, PARTS } from "./replay-takeaways";

export type LeakEvidence = {
  metric: "timing" | "angle" | "speed";
  /** The metric for the notes in this group. */
  group: number;
  /** The same metric for every other note. */
  rest: number;
  unit: "ms" | "degrees" | "speed";
};

export type Leak = {
  /** The group of notes, in plain words. */
  focus: string;
  hits: number;
  part: Part;
  partName: string;
  /** Average points per hit for that part in the group. */
  groupAverage: number;
  /** Average points per hit for that part on all other notes. */
  restAverage: number;
  maxPoints: number;
  /** Accuracy percent the player would gain if this group scored like the rest. */
  accuracyGain: number;
  evidence: LeakEvidence[];
  /** What to change, tied to the evidence. */
  fix: string;
  /** The stretches of the map where this group lost the most, as mm:ss ranges. */
  worstStretches: string[];
};

const WORST_SHARE = 0.2;
const MIN_HITS = 15;
const MIN_REST_HITS = 15;
const MIN_RELATIVE_DEFICIT = 0.05;
const MIN_GAIN = 0.05;
const MAX_LEAKS = 3;
const QUICK_GAP = 0.3;
const MAX_CUT = 115;
const STRETCH_SECONDS = 8;
const MAX_STRETCHES = 2;
const MIN_TIMING_GAP_MS = 3;
const MIN_ANGLE_GAP_DEGREES = 2;
const MIN_SPEED_GAP_RATIO = 0.08;

const LAYER_NAMES = ["lower", "middle", "upper"];
const LANE_NAMES = ["far-left", "center-left", "center-right", "far-right"];

function describePosition(lane: number, layer: number) {
  const layerName = LAYER_NAMES[layer];
  if (layer !== 1 && (lane === 0 || lane === 3)) {
    return `the ${layerName}-${lane === 0 ? "left" : "right"} corner`;
  }
  return `the ${layerName} ${LANE_NAMES[lane]} spot`;
}

type Group = { name: string; details: CutDetail[] };

function buildGroups(details: CutDetail[]) {
  const groups: Group[] = [];
  const hands: Hand[] = ["left", "right"];
  const directions = Object.keys(DIRECTION_NAMES).filter(direction => direction !== "dot") as CutDirection[];

  for (const hand of hands) {
    groups.push({ name: `your ${hand} hand`, details: details.filter(detail => detail.hand === hand) });
  }
  for (const direction of directions) {
    const name = DIRECTION_NAMES[direction].toLowerCase();
    groups.push({ name: `${name} cuts`, details: details.filter(detail => detail.direction === direction) });
    for (const hand of hands) {
      groups.push({
        name: `${name} cuts with your ${hand} hand`,
        details: details.filter(detail => detail.direction === direction && detail.hand === hand),
      });
    }
  }
  for (let layer = 0; layer < LAYER_NAMES.length; layer++) {
    for (let lane = 0; lane < LANE_NAMES.length; lane++) {
      groups.push({
        name: `notes in ${describePosition(lane, layer)}`,
        details: details.filter(detail => detail.lane === lane && detail.layer === layer),
      });
    }
  }
  groups.push({
    name: `notes that came less than ${QUICK_GAP} seconds after your last hit with that hand`,
    details: details.filter(detail => detail.gap !== undefined && detail.gap < QUICK_GAP),
  });
  return groups;
}

function mean(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function describeEvidence(group: CutDetail[], rest: CutDetail[]) {
  const evidence: LeakEvidence[] = [];
  const timing = { group: mean(group.map(d => d.timing)), rest: mean(rest.map(d => d.timing)) };
  if (timing.group - timing.rest >= MIN_TIMING_GAP_MS) {
    evidence.push({ metric: "timing", ...timing, unit: "ms" });
  }
  const angle = { group: mean(group.map(d => d.angleError)), rest: mean(rest.map(d => d.angleError)) };
  if (angle.group - angle.rest >= MIN_ANGLE_GAP_DEGREES) {
    evidence.push({ metric: "angle", ...angle, unit: "degrees" });
  }
  const speed = { group: mean(group.map(d => d.speed)), rest: mean(rest.map(d => d.speed)) };
  if (speed.rest > 0 && (speed.rest - speed.group) / speed.rest >= MIN_SPEED_GAP_RATIO) {
    evidence.push({ metric: "speed", ...speed, unit: "speed" });
  }
  return evidence;
}

function writeFix(part: Part, evidence: LeakEvidence[]) {
  const has = (metric: LeakEvidence["metric"]) => evidence.find(item => item.metric === metric);
  const angle = has("angle");
  const timing = has("timing");
  const speed = has("speed");
  const sentences: string[] = [];

  if (part === "center") {
    if (angle) {
      sentences.push(
        `Your swings on these were ${angle.group.toFixed(0)} degrees off the arrow's direction against ${angle.rest.toFixed(0)} elsewhere, which often goes with off-center hits, so try lining the blade up with the arrow earlier in the swing.`
      );
    }
    if (timing) {
      sentences.push(
        `They also landed ${timing.group.toFixed(0)} ms off the beat against ${timing.rest.toFixed(0)} elsewhere, so commit to the swing a touch earlier.`
      );
    }
    if (sentences.length === 0) {
      sentences.push(
        "Your swing angle and timing look normal here, so the offset is in where the saber crosses the block."
      );
    }
  } else if (part === "preSwing") {
    sentences.push(`${PARTS.preSwing.fix} ${PARTS.preSwing.rule}`);
    if (speed) {
      sentences.push(
        "You also swung slower on these, so start the swing from further back and speed up into the hit."
      );
    }
  } else {
    sentences.push(`${PARTS.postSwing.fix} ${PARTS.postSwing.rule}`);
  }
  return sentences.join(" ");
}

function findWorstStretches(group: CutDetail[], avgScore: number) {
  if (group.length === 0) {
    return [];
  }
  const sorted = [...group].sort((a, b) => a.time - b.time);
  const windows = new Map<number, number>();
  for (const detail of sorted) {
    const index = Math.floor(detail.time / STRETCH_SECONDS);
    windows.set(index, (windows.get(index) ?? 0) + (avgScore - detail.score));
  }
  return [...windows.entries()]
    .filter(([, lost]) => lost > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_STRETCHES)
    .map(
      ([index]) => `${formatTime(index * STRETCH_SECONDS)} to ${formatTime((index + 1) * STRETCH_SECONDS)}`
    );
}

/**
 * Finds the few groups of notes (a hand, a cut direction, a spot on the grid, quick notes) that lose the most
 * accuracy compared with the rest of the run, with what the replay shows about why and how to fix it.
 */
export function findLeaks(insights: ReplayInsights) {
  const { details, totalNotes } = insights;
  const noteScore = totalNotes * MAX_CUT;
  if (noteScore <= 0 || details.length < MIN_HITS + MIN_REST_HITS) {
    return [];
  }

  const avgScore = mean(details.map(detail => detail.score));
  const partTotals = Object.fromEntries(
    PART_KEYS.map(part => [part, details.reduce((sum, detail) => sum + detail[part], 0)])
  ) as Record<Part, number>;

  const leaks: Leak[] = [];
  for (const group of buildGroups(details)) {
    const count = group.details.length;
    const restCount = details.length - count;
    if (count < MIN_HITS || restCount < MIN_REST_HITS) {
      continue;
    }
    const members = new Set(group.details);
    const rest = details.filter(detail => !members.has(detail));

    let best: { part: Part; groupAverage: number; restAverage: number; gain: number } | undefined;
    for (const part of PART_KEYS) {
      const groupAverage = mean(group.details.map(detail => detail[part]));
      const restAverage = (partTotals[part] - groupAverage * count) / restCount;
      const deficit = restAverage - groupAverage;
      const gain = ((deficit * count) / noteScore) * 100;
      if (deficit / PARTS[part].max < MIN_RELATIVE_DEFICIT || gain < MIN_GAIN) {
        continue;
      }
      if (!best || gain > best.gain) {
        best = { part, groupAverage, restAverage, gain };
      }
    }
    if (!best) {
      continue;
    }

    const evidence = describeEvidence(group.details, rest);
    leaks.push({
      focus: group.name,
      hits: count,
      part: best.part,
      partName: PARTS[best.part].short,
      groupAverage: best.groupAverage,
      restAverage: best.restAverage,
      maxPoints: PARTS[best.part].max,
      accuracyGain: best.gain,
      evidence,
      fix: writeFix(best.part, evidence),
      worstStretches: findWorstStretches(group.details, avgScore),
    });
  }

  const chosen: Leak[] = [];
  for (const leak of leaks.sort((a, b) => b.accuracyGain - a.accuracyGain)) {
    const overlaps = chosen.some(
      other =>
        other.part === leak.part && (other.focus.includes(leak.focus) || leak.focus.includes(other.focus))
    );
    if (!overlaps) {
      chosen.push(leak);
    }
    if (chosen.length === MAX_LEAKS) {
      break;
    }
  }
  return chosen;
}

export type WorstCutPattern = {
  part: Part;
  partName: string;
  cuts: number;
  worstAverage: number;
  restAverage: number;
  maxPoints: number;
  /** Accuracy percent gained by closing half the gap between the worst cuts and the rest. */
  accuracyGain: number;
  evidence: LeakEvidence[];
  fix: string;
  worstStretches: string[];
};

/**
 * Compares the worst fifth of cuts for the part that loses the most points against the other cuts, to show
 * what goes differently on bad swings when no single hand, direction or grid spot stands out.
 */
export function findWorstCutPattern(insights: ReplayInsights) {
  const { details, totalNotes } = insights;
  const noteScore = totalNotes * MAX_CUT;
  if (noteScore <= 0 || details.length < MIN_HITS + MIN_REST_HITS) {
    return null;
  }

  const lost = (part: Part) => details.reduce((sum, detail) => sum + (PARTS[part].max - detail[part]), 0);
  const part = PART_KEYS.reduce((best, next) => (lost(next) > lost(best) ? next : best));
  const sorted = [...details].sort((a, b) => a[part] - b[part]);
  const worst = sorted.slice(0, Math.ceil(sorted.length * WORST_SHARE));
  const rest = sorted.slice(worst.length);
  const worstAverage = mean(worst.map(detail => detail[part]));
  const restAverage = mean(rest.map(detail => detail[part]));
  const evidence = describeEvidence(worst, rest);

  return {
    part,
    partName: PARTS[part].short,
    cuts: worst.length,
    worstAverage,
    restAverage,
    maxPoints: PARTS[part].max,
    accuracyGain: (((restAverage - worstAverage) * worst.length) / noteScore) * 50,
    evidence,
    fix: writeFix(part, evidence),
    worstStretches: findWorstStretches(worst, mean(details.map(detail => detail.score))),
  } satisfies WorstCutPattern;
}
