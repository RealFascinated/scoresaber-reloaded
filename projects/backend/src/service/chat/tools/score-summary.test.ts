import {
  NoteEventType,
  type NoteCutInfo,
  type Replay,
  type ReplayNote,
} from "@ssr/common/replay/replay-decoder";
import type { ScoreStatsToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/score-stats";
import { ChatGetScoreSummaryToolInputSchema } from "@ssr/common/schemas/chat/tools/score-tools";
import { checkSchema } from "@ssr/common/schemas/parse";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import type { PlayerScore } from "@ssr/common/score/player-score";
import { describe, expect, it } from "bun:test";
import { buildScoreSummary } from "./score-summary";

const leaderboard = {
  id: 10,
  fullName: "Song — Mapper [ExpertPlus]",
  songHash: "ABC123",
  songName: "Song",
  songSubName: "",
  songAuthorName: "Artist",
  songArt: "https://example.com/cover.png",
  levelAuthorName: "Mapper",
  difficulty: { id: 1, stars: 8.5, difficulty: "ExpertPlus", characteristic: "Standard" },
  difficulties: [{ id: 1, stars: 8.5, difficulty: "ExpertPlus", characteristic: "Standard" }],
  maxScore: 1000,
  ranked: true,
  qualified: false,
  stars: 8.5,
  rankedDate: new Date("2026-01-01T00:00:00.000Z"),
  status: "Ranked",
  plays: 12000,
  dailyPlays: 30,
  timestamp: new Date("2026-01-01T00:00:00.000Z"),
} satisfies ScoreSaberLeaderboard;

function makeScore(overrides: Partial<ScoreSaberScore> = {}) {
  const score: ScoreSaberScore = {
    playerId: "76561198000000000",
    leaderboardId: 10,
    scoreId: 20,
    difficulty: "ExpertPlus",
    characteristic: "Standard",
    score: 900,
    accuracy: 95.5,
    pp: 300,
    weight: 0.5,
    rank: 4,
    misses: 1,
    missedNotes: 1,
    badCuts: 0,
    maxCombo: 30,
    fullCombo: false,
    modifiers: [],
    hmd: "Unknown",
    rightController: null,
    leftController: null,
    timestamp: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
  return score;
}

function makeCut(saberType: number, cutDistanceToCenter: number) {
  const vector = { x: 0, y: 0, z: 0 };
  const cut: NoteCutInfo = {
    speedOK: true,
    directionOK: true,
    saberTypeOK: true,
    wasCutTooSoon: false,
    saberSpeed: 4,
    saberDir: vector,
    saberType,
    timeDeviation: 0,
    cutDirDeviation: 0,
    cutPoint: vector,
    cutNormal: vector,
    cutDistanceToCenter,
    cutAngle: 0,
    beforeCutRating: 1,
    afterCutRating: 1,
  };
  return cut;
}

function normalNoteId(lane: number, layer: number, color: number, direction: number) {
  return 30000 + lane * 1000 + layer * 100 + color * 10 + direction;
}

function makeReplay() {
  const notes: ReplayNote[] = [];
  for (let index = 0; index < 60; index++) {
    const color = index % 2;
    const time = 1 + index * 0.5;
    if (index === 30) {
      notes.push({
        noteID: normalNoteId(1, 0, color, 1),
        eventTime: time,
        spawnTime: time,
        eventType: NoteEventType.miss,
      });
      continue;
    }
    notes.push({
      noteID: normalNoteId(color === 0 ? 1 : 2, 0, color, 1),
      eventTime: time,
      spawnTime: time,
      eventType: NoteEventType.good,
      noteCutInfo: makeCut(color, color === 0 ? 0 : 0.15),
    });
  }
  const zero = { x: 0, y: 0, z: 0 };
  const rotation = { x: 0, y: 0, z: 0, w: 1 };
  const replay: Replay = {
    info: {
      version: "1",
      gameVersion: "1.40.0",
      timestamp: "0",
      playerID: "76561198000000000",
      playerName: "Alice",
      platform: "steam",
      trackingSystem: "Oculus",
      hmd: "Quest 3",
      controller: "Touch",
      hash: "ABC123",
      songName: "Song",
      mapper: "Mapper",
      difficulty: "ExpertPlus",
      score: 900,
      mode: "Standard",
      environment: "Default",
      modifiers: "",
      jumpDistance: 18.234,
      leftHanded: false,
      height: 1.7,
      startTime: 0,
      failTime: 0,
      speed: 0,
    },
    frames: [],
    notes,
    walls: [{ wallID: 1, energy: 0.4, time: 20.2, spawnTime: 20 }],
    heights: [],
    pauses: [{ time: 12.4, duration: 3n }],
    offset: { leftSaberPos: zero, leftSaberRot: rotation, rightSaberPos: zero, rightSaberRot: rotation },
    customData: {},
    parsedCustomData: {},
  };
  return replay;
}

function makePlayerScore(score: ScoreSaberScore) {
  const playerScore: PlayerScore<ScoreSaberScore> = { score, leaderboard };
  return playerScore;
}

describe("getScoreSummary input", () => {
  it("accepts a score id or a leaderboard id and rejects non-positive ids", () => {
    expect(checkSchema(ChatGetScoreSummaryToolInputSchema, { scoreId: 5 })).toBe(true);
    expect(checkSchema(ChatGetScoreSummaryToolInputSchema, { leaderboardId: 5, playerId: "1" })).toBe(true);
    expect(checkSchema(ChatGetScoreSummaryToolInputSchema, { scoreId: 0 })).toBe(false);
  });
});

describe("buildScoreSummary", () => {
  it("returns the score and map without replay analysis when there is no replay", () => {
    const summary = buildScoreSummary(makePlayerScore(makeScore()));

    expect(summary.map).toMatchObject({
      leaderboardId: 10,
      mapName: "Song",
      stars: 8.5,
      difficulty: "ExpertPlus",
    });
    expect(summary.result).toMatchObject({ accuracy: 95.5, pp: 300, weightedPp: 150, misses: 1 });
    expect(summary.result).not.toHaveProperty("rank");
    expect(summary.previousScore).toBeNull();
    expect(summary.beatLeader).toBeNull();
    expect(summary.replay).toBeNull();
    expect(summary.replaySetup).toBeNull();
  });

  it("reports FC accuracy and FC pp only for scores that were not full combos", () => {
    const beatLeaderScore = {
      playerId: "76561198000000000",
      songHash: "ABC123",
      leaderboardId: "abc",
      scoreId: 99,
      difficulty: "ExpertPlus",
      characteristic: "Standard",
      pauses: 1,
      fcAccuracy: 96.2,
      fullCombo: false,
      handAccuracy: { left: 112.345, right: 109.9 },
      misses: { misses: 1, missedNotes: 1, bombCuts: 0, wallsHit: 2, badCuts: 0 },
      scoreImprovement: {
        score: 0,
        pauses: 0,
        misses: { misses: 0, missedNotes: 0, bombCuts: 0, wallsHit: 0, badCuts: 0 },
        handAccuracy: { left: 0, right: 0 },
      },
      savedReplay: false,
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
    } satisfies ScoreSaberScore["beatLeaderScore"];

    const missed = buildScoreSummary(makePlayerScore(makeScore({ beatLeaderScore })));
    expect(missed.beatLeader?.fcAccuracy).toBe(96.2);
    expect(missed.beatLeader?.fcPp).toBeGreaterThan(0);
    expect(missed.beatLeader).toMatchObject({ leftHandAverageCutScore: 112.35, wallsHit: 2, pauses: 1 });

    const clean = buildScoreSummary(
      makePlayerScore(makeScore({ beatLeaderScore, fullCombo: true, misses: 0 }))
    );
    expect(clean.beatLeader?.fcAccuracy).toBeNull();
    expect(clean.beatLeader?.fcPp).toBeNull();
  });

  it("summarizes the replay with loss, hands, combo breaks and takeaways", () => {
    const summary = buildScoreSummary(makePlayerScore(makeScore()), {
      replay: makeReplay(),
      scoresSetOnMap: 3,
    });
    const replay = summary.replay;
    if (!replay) {
      throw new Error("Expected replay analysis for a score with a replay");
    }

    expect(replay.totalNotes).toBe(60);
    expect(replay.cuts).toBe(59);
    expect(replay.pointsLost.missedOrBad.points).toBe(115);
    expect(replay.pointsLost.preSwing.points).toBe(0);
    expect(replay.pointsLost.center.points).toBeGreaterThan(0);
    expect(replay.hands.left.averageCutScore).toBe(115);
    expect(replay.hands.right.averageCutScore).toBeLessThan(115);
    expect(replay.hands.right.misses).toBe(0);
    expect(replay.hands.left.misses).toBe(1);
    expect(replay.mistakes).toEqual([
      {
        at: "00:16",
        kind: "miss",
        comboBefore: 30,
        hand: "left",
        direction: "down",
        position: "bottom row, middle-left column",
        reasons: undefined,
      },
      { at: "00:20", kind: "wall", comboBefore: 8, energyAfter: 0.4 },
    ]);
    expect(replay.pausedAt).toEqual(["00:12"]);
    expect(replay.directions).toEqual([
      expect.objectContaining({ direction: "down", cuts: 59, mistakes: 1 }),
    ]);
    expect(replay.grid.every(cell => cell.cuts >= 20)).toBe(true);
    expect(replay.hands.left.partAverages).toEqual({ preSwing: 70, postSwing: 30, center: 15 });
    expect(replay.hands.right.partAverages?.center).toBeLessThan(15);
    expect(summary.result.scoresSetOnMap).toBe(3);
    expect(summary.accuracyBySecond?.source).toBe("replay");
    expect(summary.accuracyBySecond?.accuracy.length).toBeGreaterThan(30);
    expect(summary.accuracyBySecond?.pp?.length).toBe(summary.accuracyBySecond?.accuracy.length);
    expect(replay.leaks.length).toBeGreaterThan(0);
    expect(replay.leaks[0]).toMatchObject({
      lostPart: expect.any(String),
      accuracyIfFixed: expect.any(Number),
    });
    expect(replay.leaks[0].fix.length).toBeGreaterThan(0);
    expect(replay.worstCuts).toMatchObject({
      worstCuts: expect.any(Number),
      accuracyIfGapHalved: expect.any(Number),
    });
    expect(summary.replaySetup).toMatchObject({
      hmd: "Quest 3",
      jumpDistance: 18.23,
      songSpeed: 1,
      failedAt: null,
    });
  });

  it("uses BeatLeader score stats for per hand trackers and the accuracy graph against the previous run", () => {
    const stats = (graph: number[], accLeft: number) => {
      const token: ScoreStatsToken = {
        hitTracker: {
          maxCombo: 300,
          maxStreak: 40,
          leftTiming: 0.012,
          rightTiming: -0.004,
          leftMiss: 1,
          rightMiss: 0,
          leftBadCuts: 0,
          rightBadCuts: 2,
          leftBombs: 0,
          rightBombs: 1,
        },
        accuracyTracker: {
          accRight: 110.2,
          accLeft,
          leftPreswing: 1.12,
          rightPreswing: 1.05,
          averagePreswing: 1.08,
          leftPostswing: 1.2,
          rightPostswing: 1.1,
          leftTimeDependence: 0.3,
          rightTimeDependence: 0.2,
          leftAverageCut: [69.5, 13.1, 29.9],
          rightAverageCut: [69, 12.4, 29.8],
          gridAcc: [],
          fcAcc: 0.965,
        },
        winTracker: {
          won: true,
          endTime: 125.5,
          nbOfPause: 0,
          totalPauseDuration: 0,
          jumpDistance: 18,
          averageHeight: 1.62,
          averageHeadPosition: { x: 0.01, y: 1.6, z: -0.1 },
          totalScore: 900,
          maxScore: 1000,
        },
        scoreGraphTracker: { graph },
      };
      return token;
    };
    const summary = buildScoreSummary(makePlayerScore(makeScore()), {
      scoreStats: { current: stats([0.95, 0.96], 112), previous: stats([0.94, 0.955], 111) },
    });

    expect(summary.accuracyBySecond).toMatchObject({
      source: "beatleader",
      accuracy: [95, 96],
      previousAccuracy: [94, 95.5],
    });
    expect(summary.beatLeaderStats?.hands.left).toMatchObject({
      averageCutScore: 112,
      averagePreSwing: 69.5,
      averageCenter: 13.1,
      averagePostSwing: 29.9,
      misses: 1,
    });
    expect(summary.beatLeaderStats).toMatchObject({
      endTime: "02:05",
      fcAccuracy: 96.5,
      longestPerfectStreak: 40,
    });
    expect(summary.previousBeatLeaderStats?.hands.left.averageCutScore).toBe(111);
  });
});
