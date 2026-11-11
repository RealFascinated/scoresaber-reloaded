import { getMaxNoteScore, getNoteScore } from "@ssr/common/replay/replay-accuracy";
import { NoteEventType, Replay } from "@ssr/common/replay/replay-decoder";

export type Hand = "left" | "right";

export type TimelineKind = "good" | "bad" | "miss" | "bomb";

export type TimelineNote = {
  time: number;
  kind: TimelineKind;
  /** Points scored for the note, 0-1 of its maximum. */
  ratio: number;
  hand?: Hand;
};

export type TimelinePause = { time: number; duration: number };

export type LossBreakdown = {
  /** Points lost by not swinging far enough before the hit. */
  preSwing: number;
  /** Points lost by not following through after the hit. */
  postSwing: number;
  /** Points lost by not hitting the middle of the block. */
  center: number;
  missedOrBad: number;
  total: number;
};

/** Average points per hit for each part of the score (pre-swing /70, post-swing /30, center /15). */
export type PartAverages = { preSwing: number; postSwing: number; center: number };

/** One cut with its score parts, used to find which kinds of notes lose points and why. */
export type CutDetail = {
  hand: Hand;
  direction: CutDirection;
  lane: number;
  layer: number;
  /** Seconds since the previous note on the same hand, if there was one. */
  gap?: number;
  /** Total score out of 115. */
  score: number;
  /** Points for the swing before the cut, out of 70. */
  preSwing: number;
  /** Points for the swing after the cut, out of 30. */
  postSwing: number;
  /** Points for how central the cut was, out of 15. */
  center: number;
};

export type WeakMoment = { start: number; end: number; pointsLost: number; misses: number };

export type HandSummary = {
  cuts: number;
  misses: number;
  badCuts: number;
  avgScore: number;
  /** Share of cuts scoring 110+. */
  greatShare: number;
  perfectCuts: number;
  avgSpeed: number;
};

/** Beat Saber cut directions, in the game's numbering. */
export const CUT_DIRECTIONS = [
  "up",
  "down",
  "left",
  "right",
  "upLeft",
  "upRight",
  "downLeft",
  "downRight",
  "dot",
] as const;
export type CutDirection = (typeof CUT_DIRECTIONS)[number];

export type DirectionSummary = {
  direction: CutDirection;
  cuts: number;
  mistakes: number;
  avgScore: number;
};

/** One spot on the 4x3 note grid. Layer 0 is the bottom row, lane 0 the far-left column. */
export type GridCellSummary = {
  lane: number;
  layer: number;
  cuts: number;
  mistakes: number;
  avgScore: number;
};

export type SectionSummary = {
  start: number;
  end: number;
  notes: number;
  nps: number;
  avgScore: number;
  pointsLost: number;
  mistakes: number;
};

export type DensityBucket = {
  label: string;
  minNps: number;
  maxNps: number;
  avgScore: number;
  lostPer100Notes: number;
};

export type Streak = { length: number; start: number; end: number };

export type StreakSummary = {
  great: Streak;
  perfect: Streak;
  comboBreaks: { time: number; combo: number; kind: TimelineKind }[];
};

export type ReplayInsights = {
  lengthSeconds: number;
  /** Notes that were cut, missed or badly cut (bombs excluded). */
  totalNotes: number;
  notes: TimelineNote[];
  pauses: TimelinePause[];
  walls: number[];
  loss: LossBreakdown;
  partAverages: PartAverages;
  /** Every normal cut with its score parts. */
  details: CutDetail[];
  weakMoments: WeakMoment[];
  greatShare: number;
  perfectCuts: number;
  totalCuts: number;
  /** Average score of every cut, out of 115. */
  avgScore: number;
  hands: Record<Hand, HandSummary>;
  directions: DirectionSummary[];
  grid: GridCellSummary[];
  sections: SectionSummary[];
  density: DensityBucket[];
  streaks: StreakSummary;
};

const WINDOW_SECONDS = 8;
const WEAK_MOMENT_COUNT = 3;
const GREAT_SCORE = 110;
const MAX_BEFORE = 70;
const MAX_AFTER = 30;
const MAX_CENTER = 15;
const FULL_NOTE = MAX_BEFORE + MAX_AFTER + MAX_CENTER;
const MAX_CUT = 115;
const TARGET_SECTIONS = 24;
const GRID_LANES = 4;
const GRID_LAYERS = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

type DecodedNoteId = { lane: number; layer: number; colorType: number; cutDirection: number };

/**
 * Reads the grid position, color and cut direction out of a BeatLeader note id.
 */
function decodeNoteId(noteId: number): DecodedNoteId {
  const large = noteId >= 100000;
  const digit = (power: number): number => Math.floor(noteId / 10 ** power) % 10;
  // Large ids carry one extra trailing digit
  const offset = large ? 1 : 0;
  return {
    lane: digit(3 + offset),
    layer: digit(2 + offset),
    colorType: digit(1 + offset),
    cutDirection: digit(offset),
  };
}

function handOfNote(noteId: number): Hand | undefined {
  const { colorType } = decodeNoteId(noteId);
  if (colorType === 0) {
    return "left";
  }
  return colorType === 1 ? "right" : undefined;
}

type CutRecord = {
  time: number;
  hand: Hand;
  score: number;
  max: number;
  pre: number;
  center: number;
  post: number;
  speed: number;
  direction: CutDirection;
  lane: number;
  layer: number;
  gap?: number;
};

type MistakeRecord = {
  time: number;
  kind: Exclude<TimelineKind, "good">;
  hand?: Hand;
  direction?: CutDirection;
  lane: number;
  layer: number;
  lost: number;
};

function outOf115(cut: CutRecord): number {
  return (cut.score / cut.max) * MAX_CUT;
}

export function computeReplayInsights(replay: Replay): ReplayInsights {
  const notes: TimelineNote[] = [];
  const cuts: CutRecord[] = [];
  const mistakes: MistakeRecord[] = [];
  const timeline = [...replay.notes].sort((a, b) => a.eventTime - b.eventTime);

  let lengthSeconds = 0;
  const lastNoteTime: Partial<Record<Hand, number>> = {};
  for (const note of timeline) {
    lengthSeconds = Math.max(lengthSeconds, note.eventTime);
    const decoded = decodeNoteId(note.noteID);
    const hand = handOfNote(note.noteID);
    const direction = CUT_DIRECTIONS[decoded.cutDirection] ?? "dot";
    const previousTime = hand ? lastNoteTime[hand] : undefined;

    if (note.eventType === NoteEventType.good && note.noteCutInfo) {
      const cut = note.noteCutInfo;
      const { score, max: noteMax } = getNoteScore(note.noteID, cut);
      // saberType 0 is the left saber (matches BeatLeader's per-hand accuracy)
      const noteHand = hand ?? (cut.saberType === 0 ? "left" : "right");
      notes.push({
        time: note.eventTime,
        kind: "good",
        ratio: noteMax > 0 ? score / noteMax : 0,
        hand: noteHand,
      });
      cuts.push({
        time: note.eventTime,
        hand: noteHand,
        score,
        max: noteMax,
        pre: clamp(cut.beforeCutRating * MAX_BEFORE, 0, MAX_BEFORE),
        post: clamp(cut.afterCutRating * MAX_AFTER, 0, MAX_AFTER),
        center: clamp(MAX_CENTER * (1 - Math.min(1, cut.cutDistanceToCenter / 0.3)), 0, MAX_CENTER),
        speed: cut.saberSpeed,
        direction,
        lane: decoded.lane,
        layer: decoded.layer,
        gap: previousTime === undefined ? undefined : note.eventTime - previousTime,
      });
    } else if (note.eventType === NoteEventType.bad || note.eventType === NoteEventType.miss) {
      const kind = note.eventType === NoteEventType.bad ? "bad" : "miss";
      notes.push({ time: note.eventTime, kind, ratio: 0, hand });
      mistakes.push({
        time: note.eventTime,
        kind,
        hand,
        direction,
        lane: decoded.lane,
        layer: decoded.layer,
        lost: getMaxNoteScore(note.noteID),
      });
    } else if (note.eventType === NoteEventType.bomb) {
      notes.push({ time: note.eventTime, kind: "bomb", ratio: 0 });
      mistakes.push({
        time: note.eventTime,
        kind: "bomb",
        lane: decoded.lane,
        layer: decoded.layer,
        lost: 0,
      });
    }
    if (hand && note.eventType !== NoteEventType.bomb) {
      lastNoteTime[hand] = note.eventTime;
    }
  }

  const loss: LossBreakdown = { preSwing: 0, postSwing: 0, center: 0, missedOrBad: 0, total: 0 };
  let fullNoteCuts = 0;
  for (const cut of cuts) {
    if (cut.max === FULL_NOTE) {
      fullNoteCuts++;
      loss.preSwing += MAX_BEFORE - cut.pre;
      loss.postSwing += MAX_AFTER - cut.post;
      loss.center += MAX_CENTER - cut.center;
    }
  }
  const perCut = Math.max(fullNoteCuts, 1);
  const partAverages: PartAverages = {
    preSwing: MAX_BEFORE - loss.preSwing / perCut,
    postSwing: MAX_AFTER - loss.postSwing / perCut,
    center: MAX_CENTER - loss.center / perCut,
  };
  for (const mistake of mistakes) {
    loss.missedOrBad += mistake.lost;
  }
  loss.total = loss.preSwing + loss.postSwing + loss.center + loss.missedOrBad;

  const noteMistakes = mistakes.filter(mistake => mistake.kind !== "bomb");
  const lostEvents = [
    ...cuts.map(cut => ({ time: cut.time, lost: cut.max - cut.score, miss: false })),
    ...noteMistakes.map(mistake => ({ time: mistake.time, lost: mistake.lost, miss: true })),
  ];
  const sections = summarizeSections(cuts, noteMistakes, lengthSeconds);

  // One pass over the cuts and mistakes fills every per-hand / direction / grid tally
  const handTallies: Record<Hand, HandTally> = { left: newHandTally(), right: newHandTally() };
  const directionTallies = new Map<CutDirection, Tally>(
    CUT_DIRECTIONS.map(direction => [direction, newTally()])
  );
  const gridTallies = Array.from({ length: GRID_LANES * GRID_LAYERS }, newTally);
  const gridTally = (lane: number, layer: number): Tally | undefined =>
    lane >= 0 && lane < GRID_LANES && layer >= 0 && layer < GRID_LAYERS
      ? gridTallies[layer * GRID_LANES + lane]
      : undefined;

  let scoreSum = 0;
  let greatCuts = 0;
  let perfectCuts = 0;
  for (const cut of cuts) {
    const score = outOf115(cut);
    const great = score >= GREAT_SCORE;
    const perfect = cut.score >= cut.max;
    scoreSum += score;
    greatCuts += great ? 1 : 0;
    perfectCuts += perfect ? 1 : 0;

    const hand = handTallies[cut.hand];
    hand.cuts++;
    hand.scoreSum += score;
    hand.speedSum += cut.speed;
    hand.great += great ? 1 : 0;
    hand.perfect += perfect ? 1 : 0;

    const direction = directionTallies.get(cut.direction);
    const cell = gridTally(cut.lane, cut.layer);
    for (const tally of [direction, cell]) {
      if (tally) {
        tally.cuts++;
        tally.scoreSum += score;
      }
    }
  }
  for (const mistake of noteMistakes) {
    if (mistake.hand) {
      const hand = handTallies[mistake.hand];
      hand.misses += mistake.kind === "miss" ? 1 : 0;
      hand.badCuts += mistake.kind === "bad" ? 1 : 0;
    }
    if (mistake.direction) {
      const direction = directionTallies.get(mistake.direction);
      if (direction) {
        direction.mistakes++;
      }
    }
    const cell = gridTally(mistake.lane, mistake.layer);
    if (cell) {
      cell.mistakes++;
    }
  }

  return {
    lengthSeconds,
    totalNotes: cuts.length + noteMistakes.length,
    notes,
    pauses: replay.pauses.map(pause => ({ time: pause.time, duration: Number(pause.duration) })),
    walls: replay.walls.map(wall => wall.time),
    loss,
    partAverages,
    details: cuts
      .filter(cut => cut.max === FULL_NOTE)
      .map(cut => ({
        hand: cut.hand,
        direction: cut.direction,
        lane: cut.lane,
        layer: cut.layer,
        gap: cut.gap,
        score: cut.score,
        preSwing: cut.pre,
        postSwing: cut.post,
        center: cut.center,
      })),
    weakMoments: findWeakMoments(lostEvents),
    greatShare: cuts.length > 0 ? greatCuts / cuts.length : 0,
    perfectCuts,
    totalCuts: cuts.length,
    avgScore: cuts.length > 0 ? scoreSum / cuts.length : 0,
    hands: { left: summarizeHand(handTallies.left), right: summarizeHand(handTallies.right) },
    directions: CUT_DIRECTIONS.map(direction => {
      const tally = directionTallies.get(direction) ?? newTally();
      return { direction, cuts: tally.cuts, mistakes: tally.mistakes, avgScore: averageOf(tally) };
    }),
    grid: gridTallies.map((tally, index) => ({
      lane: index % GRID_LANES,
      layer: Math.floor(index / GRID_LANES),
      cuts: tally.cuts,
      mistakes: tally.mistakes,
      avgScore: averageOf(tally),
    })),
    sections,
    density: summarizeDensity(sections),
    streaks: summarizeStreaks(notes),
  };
}

type Tally = { cuts: number; mistakes: number; scoreSum: number };

function newTally(): Tally {
  return { cuts: 0, mistakes: 0, scoreSum: 0 };
}

function averageOf(tally: Tally): number {
  return tally.cuts > 0 ? tally.scoreSum / tally.cuts : 0;
}

type HandTally = {
  cuts: number;
  scoreSum: number;
  speedSum: number;
  great: number;
  perfect: number;
  misses: number;
  badCuts: number;
};

function newHandTally(): HandTally {
  return { cuts: 0, scoreSum: 0, speedSum: 0, great: 0, perfect: 0, misses: 0, badCuts: 0 };
}

function summarizeHand(tally: HandTally): HandSummary {
  const cuts = Math.max(tally.cuts, 1);
  return {
    cuts: tally.cuts,
    misses: tally.misses,
    badCuts: tally.badCuts,
    avgScore: tally.cuts > 0 ? tally.scoreSum / cuts : 0,
    greatShare: tally.cuts > 0 ? tally.great / cuts : 0,
    perfectCuts: tally.perfect,
    avgSpeed: tally.cuts > 0 ? tally.speedSum / cuts : 0,
  };
}

function summarizeSections(
  cuts: CutRecord[],
  mistakes: MistakeRecord[],
  lengthSeconds: number
): SectionSummary[] {
  if (lengthSeconds <= 0) {
    return [];
  }
  const sectionLength = Math.max(5, Math.round(lengthSeconds / TARGET_SECTIONS / 5) * 5);
  const count = Math.ceil(lengthSeconds / sectionLength);
  const indexOf = (time: number): number => clamp(Math.floor(time / sectionLength), 0, count - 1);

  const buckets = Array.from({ length: count }, () => ({
    cuts: 0,
    mistakes: 0,
    scoreSum: 0,
    pointsLost: 0,
  }));
  for (const cut of cuts) {
    const bucket = buckets[indexOf(cut.time)];
    bucket.cuts++;
    bucket.scoreSum += outOf115(cut);
    bucket.pointsLost += cut.max - cut.score;
  }
  for (const mistake of mistakes) {
    const bucket = buckets[indexOf(mistake.time)];
    bucket.mistakes++;
    bucket.pointsLost += mistake.lost;
  }

  return buckets.map((bucket, index) => {
    const start = index * sectionLength;
    const end = Math.min(start + sectionLength, lengthSeconds);
    const notes = bucket.cuts + bucket.mistakes;
    return {
      start,
      end,
      notes,
      nps: notes / Math.max(end - start, 1),
      avgScore: bucket.cuts > 0 ? bucket.scoreSum / bucket.cuts : 0,
      pointsLost: bucket.pointsLost,
      mistakes: bucket.mistakes,
    };
  });
}

function summarizeDensity(sections: SectionSummary[]): DensityBucket[] {
  const active = sections.filter(section => section.notes > 0).sort((a, b) => a.nps - b.nps);
  if (active.length < 3) {
    return [];
  }
  const size = Math.ceil(active.length / 3);
  const labels = ["Quiet parts", "Medium parts", "Busy parts"];
  const buckets: DensityBucket[] = [];
  labels.forEach((label, index) => {
    const group = active.slice(index * size, (index + 1) * size);
    if (group.length === 0) {
      return;
    }
    const notes = group.reduce((sum, section) => sum + section.notes, 0);
    buckets.push({
      label,
      minNps: group[0].nps,
      maxNps: group[group.length - 1].nps,
      avgScore: group.reduce((sum, section) => sum + section.avgScore * section.notes, 0) / notes,
      lostPer100Notes: (group.reduce((sum, section) => sum + section.pointsLost, 0) / notes) * 100,
    });
  });
  return buckets;
}

function summarizeStreaks(notes: TimelineNote[]): StreakSummary {
  const great: Streak = { length: 0, start: 0, end: 0 };
  const perfect: Streak = { length: 0, start: 0, end: 0 };
  const comboBreaks: StreakSummary["comboBreaks"] = [];

  let greatRun: Streak = { length: 0, start: 0, end: 0 };
  let perfectRun: Streak = { length: 0, start: 0, end: 0 };
  let combo = 0;

  const extend = (run: Streak, hit: boolean, time: number): Streak => {
    if (!hit) {
      return { length: 0, start: 0, end: 0 };
    }
    return { length: run.length + 1, start: run.length === 0 ? time : run.start, end: time };
  };

  for (const note of notes) {
    if (note.kind === "good") {
      combo++;
      greatRun = extend(greatRun, note.ratio * MAX_CUT >= GREAT_SCORE, note.time);
      perfectRun = extend(perfectRun, note.ratio >= 1, note.time);
      if (greatRun.length > great.length) {
        Object.assign(great, greatRun);
      }
      if (perfectRun.length > perfect.length) {
        Object.assign(perfect, perfectRun);
      }
    } else {
      comboBreaks.push({ time: note.time, combo, kind: note.kind });
      combo = 0;
      greatRun = extend(greatRun, false, note.time);
      perfectRun = extend(perfectRun, false, note.time);
    }
  }

  return { great, perfect, comboBreaks };
}

/**
 * Finds the non-overlapping windows where the most points were lost.
 */
function findWeakMoments(events: { time: number; lost: number; miss: boolean }[]): WeakMoment[] {
  if (events.length === 0) {
    return [];
  }

  const sorted = events.sort((a, b) => a.time - b.time);
  const windows: WeakMoment[] = [];
  let startIndex = 0;
  let lost = 0;
  let misses = 0;

  for (let endIndex = 0; endIndex < sorted.length; endIndex++) {
    lost += sorted[endIndex].lost;
    misses += sorted[endIndex].miss ? 1 : 0;
    while (sorted[endIndex].time - sorted[startIndex].time > WINDOW_SECONDS) {
      lost -= sorted[startIndex].lost;
      misses -= sorted[startIndex].miss ? 1 : 0;
      startIndex++;
    }
    windows.push({ start: sorted[startIndex].time, end: sorted[endIndex].time, pointsLost: lost, misses });
  }

  windows.sort((a, b) => b.pointsLost - a.pointsLost);
  const picked: WeakMoment[] = [];
  for (const window of windows) {
    if (picked.length >= WEAK_MOMENT_COUNT) {
      break;
    }
    if (picked.every(other => window.start > other.end || window.end < other.start)) {
      picked.push(window);
    }
  }
  return picked;
}
