import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { computeAccuracyBySecond } from "@ssr/common/replay/replay-accuracy";
import { findLeaks, findWorstCutPattern } from "@ssr/common/replay/replay-coaching";
import { NoteEventType, type Replay } from "@ssr/common/replay/replay-decoder";
import {
  CUT_DIRECTIONS,
  computeReplayInsights,
  decodeNoteId,
  type CutDetail,
  type ReplayInsights,
} from "@ssr/common/replay/replay-insights";
import { describeGridCell } from "@ssr/common/replay/replay-takeaways";
import type { ScoreStatsToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/score-stats";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import type { PlayerScore } from "@ssr/common/score/player-score";
import { formatTime } from "@ssr/common/utils/time-utils";

const MAX_CUT = 115;

export type ScoreSummaryExtras = {
  replay?: Replay;
  scoreStats?: { current: ScoreStatsToken; previous?: ScoreStatsToken };
  /** Scores the player has set on this map, the current one included. */
  scoresSetOnMap?: number;
};

function round(value: number, digits: number = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clock(seconds: number) {
  return formatTime(Math.max(0, Math.floor(seconds)));
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function toPercent(value: number) {
  return value <= 1 ? value * 100 : value;
}

function summarizeMap({ leaderboard, beatSaver }: PlayerScore<ScoreSaberScore>) {
  const difficulty = beatSaver?.difficulty;
  return {
    leaderboardId: leaderboard.id,
    mapName: leaderboard.songName,
    songSubName: leaderboard.songSubName,
    songAuthorName: leaderboard.songAuthorName,
    mapper: leaderboard.levelAuthorName,
    songHash: leaderboard.songHash,
    beatSaverKey: beatSaver?.bsr,
    difficulty: leaderboard.difficulty.difficulty,
    characteristic: leaderboard.difficulty.characteristic,
    stars: leaderboard.stars,
    ranked: leaderboard.ranked,
    qualified: leaderboard.qualified,
    rankedDate: leaderboard.rankedDate?.toISOString(),
    maxScore: leaderboard.maxScore,
    plays: leaderboard.plays,
    dailyPlays: leaderboard.dailyPlays,
    maxPp: leaderboard.stars > 0 ? round(ScoreSaberCurve.getPp(leaderboard.stars, 100)) : null,
    bpm: beatSaver?.metadata.bpm,
    lengthSeconds: difficulty?.seconds,
    notes: difficulty?.notes,
    bombs: difficulty?.bombs,
    walls: difficulty?.obstacles,
    nps: difficulty ? round(difficulty.nps) : undefined,
    njs: difficulty?.njs,
    offset: difficulty ? round(difficulty.offset) : undefined,
    chroma: difficulty?.chroma,
    noodleExtensions: difficulty?.noodleExtensions,
    mappingExtensions: difficulty?.mappingExtensions,
  };
}

function summarizeResult({ score }: PlayerScore<ScoreSaberScore>, scoresSetOnMap?: number) {
  return {
    accuracy: round(score.accuracy, 4),
    score: score.score,
    pp: score.pp,
    weight: score.weight,
    weightedPp: round(score.pp * score.weight),
    misses: score.misses,
    missedNotes: score.missedNotes,
    badCuts: score.badCuts,
    maxCombo: score.maxCombo,
    fullCombo: score.fullCombo,
    modifiers: score.modifiers,
    hmd: score.hmd,
    leftController: score.leftController,
    rightController: score.rightController,
    timestamp: score.timestamp.toISOString(),
    scoresSetOnMap: scoresSetOnMap ?? null,
  };
}

function summarizePrevious(score: ScoreSaberScore) {
  const previous = score.previousScore;
  if (!previous) {
    return null;
  }
  return {
    scoreId: previous.scoreId,
    timestamp: previous.timestamp.toISOString(),
    accuracy: round(previous.accuracy, 4),
    pp: previous.pp,
    score: previous.score,
    misses: previous.misses,
    badCuts: previous.badCuts,
    maxCombo: previous.maxCombo,
    fullCombo: previous.fullCombo,
    modifiers: previous.modifiers,
    change: {
      accuracy: round(previous.change.accuracy, 4),
      pp: previous.change.pp === undefined ? undefined : round(previous.change.pp),
      score: previous.change.score,
      misses: previous.change.misses,
      missedNotes: previous.change.missedNotes,
      badCuts: previous.change.badCuts,
      maxCombo: previous.change.maxCombo,
    },
  };
}

function summarizeBeatLeader({ score, leaderboard }: PlayerScore<ScoreSaberScore>) {
  const beatLeader = score.beatLeaderScore;
  if (!beatLeader) {
    return null;
  }
  const fcAccuracy = toPercent(beatLeader.fcAccuracy);
  const showFc = !score.fullCombo && fcAccuracy > 0;
  const improvement = beatLeader.scoreImprovement;
  return {
    beatLeaderScoreId: beatLeader.scoreId,
    fcAccuracy: showFc ? round(fcAccuracy, 4) : null,
    fcPp:
      showFc && leaderboard.stars > 0 ? round(ScoreSaberCurve.getPp(leaderboard.stars, fcAccuracy)) : null,
    leftHandAverageCutScore: round(beatLeader.handAccuracy.left),
    rightHandAverageCutScore: round(beatLeader.handAccuracy.right),
    pauses: beatLeader.pauses,
    misses: beatLeader.misses.misses,
    missedNotes: beatLeader.misses.missedNotes,
    badCuts: beatLeader.misses.badCuts,
    bombCuts: beatLeader.misses.bombCuts,
    wallsHit: beatLeader.misses.wallsHit,
    savedReplay: beatLeader.savedReplay,
    changeFromPreviousBeatLeaderScore: {
      score: improvement.score,
      pauses: improvement.pauses,
      misses: improvement.misses.misses,
      badCuts: improvement.misses.badCuts,
      bombCuts: improvement.misses.bombCuts,
      wallsHit: improvement.misses.wallsHit,
      leftHandAverageCutScore: round(improvement.handAccuracy.left),
      rightHandAverageCutScore: round(improvement.handAccuracy.right),
    },
  };
}

function summarizeScoreStatsHands(stats: ScoreStatsToken) {
  const { accuracyTracker, hitTracker } = stats;
  const hand = (side: "left" | "right") => {
    const [preSwing, center, postSwing] =
      side === "left" ? accuracyTracker.leftAverageCut : accuracyTracker.rightAverageCut;
    return {
      averageCutScore: round(side === "left" ? accuracyTracker.accLeft : accuracyTracker.accRight),
      averagePreSwing: preSwing === undefined ? null : round(preSwing),
      averageCenter: center === undefined ? null : round(center),
      averagePostSwing: postSwing === undefined ? null : round(postSwing),
      preSwingRating: round(
        side === "left" ? accuracyTracker.leftPreswing : accuracyTracker.rightPreswing,
        3
      ),
      postSwingRating: round(
        side === "left" ? accuracyTracker.leftPostswing : accuracyTracker.rightPostswing,
        3
      ),
      timingDeviation: round(side === "left" ? hitTracker.leftTiming : hitTracker.rightTiming, 4),
      timeDependence: round(
        side === "left" ? accuracyTracker.leftTimeDependence : accuracyTracker.rightTimeDependence,
        4
      ),
      misses: side === "left" ? hitTracker.leftMiss : hitTracker.rightMiss,
      badCuts: side === "left" ? hitTracker.leftBadCuts : hitTracker.rightBadCuts,
      bombsHit: side === "left" ? hitTracker.leftBombs : hitTracker.rightBombs,
    };
  };
  return { left: hand("left"), right: hand("right") };
}

function summarizeScoreStats(stats: ScoreStatsToken) {
  const { winTracker, hitTracker, accuracyTracker } = stats;
  return {
    won: winTracker.won,
    endTime: clock(winTracker.endTime),
    failedAt: winTracker.failTime ? clock(winTracker.failTime) : null,
    pauses: winTracker.nbOfPause,
    totalPauseSeconds: round(winTracker.totalPauseDuration, 1),
    jumpDistance: round(winTracker.jumpDistance),
    averageHeight: round(winTracker.averageHeight),
    averageHeadPosition: {
      x: round(winTracker.averageHeadPosition.x),
      y: round(winTracker.averageHeadPosition.y),
      z: round(winTracker.averageHeadPosition.z),
    },
    maxCombo: hitTracker.maxCombo,
    longestPerfectStreak: hitTracker.maxStreak,
    averagePreSwingRating: round(accuracyTracker.averagePreswing, 3),
    fcAccuracy: round(toPercent(accuracyTracker.fcAcc), 4),
    hands: summarizeScoreStatsHands(stats),
  };
}

function summarizeAccuracyBySecond(
  { leaderboard }: PlayerScore<ScoreSaberScore>,
  { replay, scoreStats }: ScoreSummaryExtras
) {
  const fromStats = scoreStats?.current.scoreGraphTracker.graph;
  const accuracy = fromStats
    ? fromStats.map(value => round(value * 100))
    : replay
      ? computeAccuracyBySecond(replay).map(value => (value === null ? null : value / 100))
      : undefined;
  if (!accuracy) {
    return null;
  }
  const previous = scoreStats?.previous?.scoreGraphTracker.graph;
  return {
    source: fromStats ? "beatleader" : "replay",
    accuracy,
    previousAccuracy: previous ? previous.map(value => round(value * 100)) : null,
    pp:
      leaderboard.stars > 0
        ? accuracy.map(value =>
            value === null ? null : round(ScoreSaberCurve.getPp(leaderboard.stars, value))
          )
        : null,
  };
}

function partAverages(details: CutDetail[]) {
  if (details.length === 0) {
    return null;
  }
  return {
    preSwing: round(average(details.map(detail => detail.preSwing))),
    postSwing: round(average(details.map(detail => detail.postSwing))),
    center: round(average(details.map(detail => detail.center))),
  };
}

function badCutReasons(replay: Replay, noteIndex: number) {
  const cut = replay.notes[noteIndex]?.noteCutInfo;
  if (!cut) {
    return [];
  }
  const reasons: string[] = [];
  if (!cut.saberTypeOK) {
    reasons.push("wrong saber");
  }
  if (!cut.directionOK) {
    reasons.push("wrong direction");
  }
  if (!cut.speedOK) {
    reasons.push("too slow");
  }
  if (cut.wasCutTooSoon) {
    reasons.push("cut too soon");
  }
  return reasons;
}

function listMistakes(replay: Replay) {
  type Event = { time: number; kind: "note"; index: number } | { time: number; kind: "wall"; energy: number };
  const events: Event[] = [
    ...replay.notes.map((note, index) => ({ time: note.eventTime, kind: "note" as const, index })),
    ...replay.walls.map(wall => ({ time: wall.time, kind: "wall" as const, energy: wall.energy })),
  ].sort((a, b) => a.time - b.time);

  let combo = 0;
  const mistakes = [];
  for (const event of events) {
    if (event.kind === "wall") {
      mistakes.push({
        at: clock(event.time),
        kind: "wall",
        comboBefore: combo,
        energyAfter: round(event.energy),
      });
      combo = 0;
      continue;
    }
    const note = replay.notes[event.index];
    if (note.eventType === NoteEventType.good) {
      combo++;
      continue;
    }
    const decoded = decodeNoteId(note.noteID);
    const kind =
      note.eventType === NoteEventType.bad
        ? "badCut"
        : note.eventType === NoteEventType.miss
          ? "miss"
          : "bomb";
    const hand = decoded.colorType === 0 ? "left" : decoded.colorType === 1 ? "right" : undefined;
    mistakes.push({
      at: clock(note.eventTime),
      kind,
      comboBefore: combo,
      hand: kind === "bomb" ? undefined : hand,
      direction: kind === "bomb" ? undefined : (CUT_DIRECTIONS[decoded.cutDirection] ?? "dot"),
      position: describeGridCell({
        lane: decoded.lane,
        layer: decoded.layer,
        cuts: 0,
        mistakes: 0,
        avgScore: 0,
      }),
      reasons: kind === "badCut" ? badCutReasons(replay, event.index) : undefined,
    });
    combo = 0;
  }
  return mistakes;
}

function summarizeCutQuality(replay: Replay) {
  const byHand = {
    left: [] as { timing: number; angle: number; speed: number }[],
    right: [] as { timing: number; angle: number; speed: number }[],
  };
  for (const note of replay.notes) {
    const cut = note.noteCutInfo;
    if (note.eventType !== NoteEventType.good || !cut) {
      continue;
    }
    byHand[cut.saberType === 0 ? "left" : "right"].push({
      timing: cut.timeDeviation * 1000,
      angle: Math.abs(cut.cutDirDeviation),
      speed: cut.saberSpeed,
    });
  }
  const hand = (cuts: { timing: number; angle: number; speed: number }[]) => ({
    averageTimeDeviationMs: round(average(cuts.map(cut => cut.timing)), 1),
    averageAbsoluteTimeDeviationMs: round(average(cuts.map(cut => Math.abs(cut.timing))), 1),
    averageCutAngleErrorDegrees: round(average(cuts.map(cut => cut.angle)), 1),
    minSwingSpeed: cuts.length > 0 ? round(Math.min(...cuts.map(cut => cut.speed))) : null,
    maxSwingSpeed: cuts.length > 0 ? round(Math.max(...cuts.map(cut => cut.speed))) : null,
  });
  return { left: hand(byHand.left), right: hand(byHand.right) };
}

const MIN_GROUP_CUTS = 20;
const MAX_WEAK_MOMENTS = 3;

function summarizeLeaks(insights: ReplayInsights, stars: number, accuracy: number) {
  return findLeaks(insights).map(leak => ({
    focus: leak.focus,
    hits: leak.hits,
    lostPart: leak.partName,
    averagePointsInGroup: round(leak.groupAverage),
    averagePointsElsewhere: round(leak.restAverage),
    maxPoints: leak.maxPoints,
    accuracyIfFixed: round(leak.accuracyGain, 2),
    rawPpIfFixed:
      stars > 0
        ? round(
            ScoreSaberCurve.getPp(stars, accuracy + leak.accuracyGain) -
              ScoreSaberCurve.getPp(stars, accuracy)
          )
        : null,
    evidence: leak.evidence.map(item => ({
      metric: item.metric,
      inGroup: round(item.group, 1),
      elsewhere: round(item.rest, 1),
      unit: item.unit,
    })),
    fix: leak.fix,
    worstStretches: leak.worstStretches,
  }));
}

function summarizeWorstCuts(insights: ReplayInsights, stars: number, accuracy: number) {
  const pattern = findWorstCutPattern(insights);
  if (!pattern) {
    return null;
  }
  return {
    lostPart: pattern.partName,
    worstCuts: pattern.cuts,
    accuracyIfGapHalved: round(pattern.accuracyGain, 2),
    rawPpIfGapHalved:
      stars > 0
        ? round(
            ScoreSaberCurve.getPp(stars, accuracy + pattern.accuracyGain) -
              ScoreSaberCurve.getPp(stars, accuracy)
          )
        : null,
    evidence: pattern.evidence.map(item => ({
      metric: item.metric,
      inWorstCuts: round(item.group, 1),
      inOtherCuts: round(item.rest, 1),
      unit: item.unit,
    })),
    fix: pattern.fix,
    worstStretches: pattern.worstStretches,
  };
}

function summarizeInsights(insights: ReplayInsights, replay: Replay, stars: number, accuracy: number) {
  const noteScore = insights.totalNotes * MAX_CUT;
  const accuracyCost = (points: number) => (noteScore > 0 ? round((points / noteScore) * 100, 3) : 0);
  const { loss, streaks, details } = insights;
  const quality = summarizeCutQuality(replay);
  const hand = (side: "left" | "right") => {
    const summary = insights.hands[side];
    return {
      cuts: summary.cuts,
      misses: summary.misses,
      badCuts: summary.badCuts,
      averageCutScore: round(summary.avgScore),
      greatCutPercent: round(summary.greatShare * 100, 1),
      perfectCuts: summary.perfectCuts,
      averageSwingSpeed: round(summary.avgSpeed),
      partAverages: partAverages(details.filter(detail => detail.hand === side)),
      ...quality[side],
    };
  };
  const streak = (run: { length: number; start: number; end: number }) =>
    run.length > 0 ? { length: run.length, from: clock(run.start), to: clock(run.end) } : null;

  return {
    lengthSeconds: round(insights.lengthSeconds, 1),
    totalNotes: insights.totalNotes,
    cuts: insights.totalCuts,
    averageCutScore: round(insights.avgScore),
    greatCutPercent: round(insights.greatShare * 100, 1),
    perfectCuts: insights.perfectCuts,
    partAverages: partAverages(details),
    pointsLost: {
      preSwing: { points: Math.round(loss.preSwing), accuracyCost: accuracyCost(loss.preSwing) },
      postSwing: { points: Math.round(loss.postSwing), accuracyCost: accuracyCost(loss.postSwing) },
      center: { points: Math.round(loss.center), accuracyCost: accuracyCost(loss.center) },
      missedOrBad: { points: Math.round(loss.missedOrBad), accuracyCost: accuracyCost(loss.missedOrBad) },
      total: { points: Math.round(loss.total), accuracyCost: accuracyCost(loss.total) },
    },
    hands: { left: hand("left"), right: hand("right") },
    directions: insights.directions
      .filter(direction => direction.cuts >= MIN_GROUP_CUTS)
      .map(direction => ({
        direction: direction.direction,
        cuts: direction.cuts,
        mistakes: direction.mistakes,
        averageCutScore: round(direction.avgScore),
        partAverages: partAverages(details.filter(detail => detail.direction === direction.direction)),
      })),
    grid: insights.grid
      .filter(cell => cell.cuts >= MIN_GROUP_CUTS)
      .map(cell => ({
        position: describeGridCell(cell),
        cuts: cell.cuts,
        mistakes: cell.mistakes,
        averageCutScore: round(cell.avgScore),
        partAverages: partAverages(
          details.filter(detail => detail.lane === cell.lane && detail.layer === cell.layer)
        ),
      })),
    longestGreatStreak: streak(streaks.great),
    longestPerfectStreak: streak(streaks.perfect),
    mistakes: listMistakes(replay),
    weakMoments: insights.weakMoments.slice(0, MAX_WEAK_MOMENTS).map(moment => ({
      from: clock(moment.start),
      to: clock(moment.end),
      pointsLost: Math.round(moment.pointsLost),
      misses: moment.misses,
    })),
    pausedAt: insights.pauses.map(pause => clock(pause.time)),
    leaks: summarizeLeaks(insights, stars, accuracy),
    worstCuts: summarizeWorstCuts(insights, stars, accuracy),
  };
}

function summarizeSetup(replay: Replay) {
  const { info } = replay;
  return {
    gameVersion: info.gameVersion,
    pluginVersion: info.version,
    platform: info.platform,
    hmd: info.hmd,
    controller: info.controller,
    trackingSystem: info.trackingSystem,
    environment: info.environment,
    replayModifiers: info.modifiers,
    height: round(info.height),
    automaticHeightChanges: replay.heights.length,
    jumpDistance: round(info.jumpDistance),
    leftHanded: info.leftHanded,
    songSpeed: info.speed > 0 ? round(info.speed) : 1,
    startedAt: info.startTime > 0 ? clock(info.startTime) : null,
    failedAt: info.failTime > 0 ? clock(info.failTime) : null,
  };
}

/**
 * Builds the score summary the chat model reads: the score page's numbers, plus BeatLeader's score
 * stats and a replay analysis trimmed to what is worth coaching: directions and grid cells with enough cuts, the three roughest moments and the biggest accuracy leaks with causes and fixes.
 */
export function buildScoreSummary(
  playerScore: PlayerScore<ScoreSaberScore>,
  extras: ScoreSummaryExtras = {}
) {
  const { score } = playerScore;
  const { replay, scoreStats } = extras;
  return {
    scoreId: score.scoreId,
    playerId: score.playerId,
    playerName: score.playerInfo?.name ?? undefined,
    playerCountry: score.playerInfo?.country ?? undefined,
    map: summarizeMap(playerScore),
    result: summarizeResult(playerScore, extras.scoresSetOnMap),
    previousScore: summarizePrevious(score),
    beatLeader: summarizeBeatLeader(playerScore),
    beatLeaderStats: scoreStats ? summarizeScoreStats(scoreStats.current) : null,
    previousBeatLeaderStats: scoreStats?.previous ? summarizeScoreStats(scoreStats.previous) : null,
    accuracyBySecond: summarizeAccuracyBySecond(playerScore, extras),
    replaySetup: replay ? summarizeSetup(replay) : null,
    replay: replay
      ? summarizeInsights(
          computeReplayInsights(replay, { weakMomentCount: MAX_WEAK_MOMENTS }),
          replay,
          playerScore.leaderboard.stars,
          score.accuracy
        )
      : null,
  };
}
