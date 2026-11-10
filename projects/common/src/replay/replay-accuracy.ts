import { NoteEventType, type NoteCutInfo, type Replay } from "./replay-decoder";

/** Offset BeatLeader adds to the game's scoring type when it encodes a note id. */
const SCORING_TYPE_OFFSET = 2;

const BURST_SLIDER_HEAD = 4;
const BURST_SLIDER_ELEMENT = 5;

const MAX_BEFORE_CUT = 70;
const MAX_AFTER_CUT = 30;
const MAX_CENTER_CUT = 15;
const MAX_NORMAL_CUT = MAX_BEFORE_CUT + MAX_AFTER_CUT + MAX_CENTER_CUT;
const MAX_BURST_SLIDER_HEAD_CUT = MAX_BEFORE_CUT + MAX_CENTER_CUT;
const BURST_SLIDER_ELEMENT_SCORE = 20;

/** How many scored notes a multiplier level lasts, before the next level starts (x8 is the last). */
const NOTES_PER_MULTIPLIER_LEVEL: Record<number, number> = { 1: 1, 2: 4, 4: 8 };
const MAX_MULTIPLIER = 8;

/**
 * Gets the game's scoring type of a note out of its BeatLeader note id.
 */
function getScoringType(noteId: number): number {
  const encoded = noteId < 100000 ? Math.floor(noteId / 10000) : Math.floor(noteId / 100000);
  return encoded - SCORING_TYPE_OFFSET;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** The score a good cut of a note is worth, before the multiplier, and the most the note could be worth. */
function getNoteScore(noteId: number, cut: NoteCutInfo): { score: number; max: number } {
  const scoringType = getScoringType(noteId);
  if (scoringType === BURST_SLIDER_ELEMENT) {
    return { score: BURST_SLIDER_ELEMENT_SCORE, max: BURST_SLIDER_ELEMENT_SCORE };
  }

  const before = clamp(cut.beforeCutRating * MAX_BEFORE_CUT, 0, MAX_BEFORE_CUT);
  const after = clamp(cut.afterCutRating * MAX_AFTER_CUT, 0, MAX_AFTER_CUT);
  const center = clamp(MAX_CENTER_CUT * (1 - Math.min(1, cut.cutDistanceToCenter / 0.3)), 0, MAX_CENTER_CUT);

  if (scoringType === BURST_SLIDER_HEAD) {
    return { score: Math.round(before + center), max: MAX_BURST_SLIDER_HEAD_CUT };
  }
  return { score: Math.round(before + after + center), max: MAX_NORMAL_CUT };
}

function getMaxNoteScore(noteId: number): number {
  const scoringType = getScoringType(noteId);
  if (scoringType === BURST_SLIDER_ELEMENT) {
    return BURST_SLIDER_ELEMENT_SCORE;
  }
  return scoringType === BURST_SLIDER_HEAD ? MAX_BURST_SLIDER_HEAD_CUT : MAX_NORMAL_CUT;
}

class MultiplierCounter {
  public value = 1;
  private progress = 0;

  /** Registers a scored note (the note itself is worth the multiplier from before it). */
  public hit(): void {
    if (this.value >= MAX_MULTIPLIER) {
      return;
    }
    this.progress++;
    if (this.progress >= NOTES_PER_MULTIPLIER_LEVEL[this.value]) {
      this.value *= 2;
      this.progress = 0;
    }
  }

  /** A miss, bad cut, bomb or wall: the multiplier drops a level. */
  public reset(): void {
    this.value = Math.max(1, this.value / 2);
    this.progress = 0;
  }
}

type ReplayEvent =
  | { time: number; kind: "note"; noteId: number; type: number; cut?: NoteCutInfo }
  | {
      time: number;
      kind: "wall";
    };

/**
 * Computes the running accuracy of a replay for every second of the song (PBOT).
 *
 * `result[i]` is the score so far divided by the maximum score so far (in hundredths of a percent, so
 * 97.52% is 9752) after all events up to `i` seconds. It is null before the first note that counts.
 *
 * @param replay the decoded replay
 */
export function computeAccuracyBySecond(replay: Replay): (number | null)[] {
  const events: ReplayEvent[] = [
    ...replay.notes.map(note => ({
      time: note.eventTime,
      kind: "note" as const,
      noteId: note.noteID,
      type: note.eventType,
      cut: note.noteCutInfo,
    })),
    ...(replay.walls ?? []).map(wall => ({ time: wall.time, kind: "wall" as const })),
  ].sort((a, b) => a.time - b.time);

  const lastTime = events.length > 0 ? events[events.length - 1].time : 0;
  const result: (number | null)[] = new Array(Math.ceil(lastTime) + 1).fill(null);

  const multiplier = new MultiplierCounter();
  const maxMultiplier = new MultiplierCounter();
  let current = 0;
  let max = 0;
  let nextSecond = 0;

  const flushUntil = (second: number) => {
    // Every second before this event (i < time) keeps the accuracy of the events before it
    while (nextSecond < second && nextSecond < result.length) {
      result[nextSecond] = max > 0 ? Math.round((current / max) * 10000) : null;
      nextSecond++;
    }
  };

  for (const event of events) {
    flushUntil(Math.ceil(event.time));

    if (event.kind === "wall") {
      multiplier.reset();
      continue;
    }
    if (event.type === NoteEventType.bomb) {
      multiplier.reset();
      continue;
    }

    max += getMaxNoteScore(event.noteId) * maxMultiplier.value;
    maxMultiplier.hit();

    if (event.type === NoteEventType.good && event.cut) {
      current += getNoteScore(event.noteId, event.cut).score * multiplier.value;
      multiplier.hit();
    } else {
      multiplier.reset();
    }
  }
  flushUntil(result.length);

  return result;
}
