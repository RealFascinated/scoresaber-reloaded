import type { ScoreSaberHistoryScore } from "@ssr/common/schemas/scoresaber/score/history-score";
import type { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { Modifier } from "@ssr/common/score/modifier";
import { describe, expect, test } from "bun:test";
import {
  scoreSaberMedalScoreRowToType,
  scoreSaberScoreToMedalScore,
} from "../../../../src/db/converter/medal-score";
import type { ScoreSaberScoreRow } from "../../../../src/db/schema";

function baseRow(overrides: Partial<ScoreSaberScoreRow> = {}): ScoreSaberScoreRow {
  return {
    scoreId: 7001,
    playerId: "medal-player",
    leaderboardId: 300,
    difficulty: "ExpertPlus",
    characteristic: "Standard",
    score: 1_000_000,
    accuracy: 0.99,
    pp: 400,
    medals: 4,
    missedNotes: 1,
    badCuts: 2,
    maxCombo: 500,
    fullCombo: false,
    modifiers: ["SS", "invalid-modifier"],
    hmd: "Valve Index",
    rightController: "knuckles",
    leftController: "knuckles",
    timestamp: new Date("2024-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

function baseScore(overrides: Partial<ScoreSaberScore> = {}): ScoreSaberScore {
  return {
    playerId: "live-player",
    leaderboardId: 301,
    scoreId: 8001,
    difficulty: "Hard",
    characteristic: "OneSaber",
    score: 900_000,
    accuracy: 0.95,
    pp: 200,
    weight: 0.8,
    rank: 12,
    misses: 4,
    missedNotes: 3,
    badCuts: 1,
    maxCombo: 250,
    fullCombo: true,
    modifiers: [Modifier.DA],
    playerInfo: {
      id: "live-player",
      avatar: "https://example.com/avatar.png",
    },
    hmd: "Quest",
    rightController: "quest",
    leftController: "quest",
    timestamp: new Date("2024-07-02T00:00:00.000Z"),
    ...overrides,
  };
}

describe("scoreSaberMedalScoreRowToType", () => {
  const cases: { name: string; row: ScoreSaberScoreRow; expected: ScoreSaberMedalScore }[] = [
    {
      name: "maps all fields with default rank and null playerInfo",
      row: baseRow(),
      expected: {
        playerId: "medal-player",
        leaderboardId: 300,
        scoreId: 7001,
        difficulty: "ExpertPlus",
        characteristic: "Standard",
        score: 1_000_000,
        accuracy: 0.99,
        medals: 4,
        rank: 0,
        misses: 3,
        missedNotes: 1,
        badCuts: 2,
        maxCombo: 500,
        fullCombo: false,
        modifiers: [Modifier.SS],
        playerInfo: null,
        hmd: "Valve Index",
        rightController: "knuckles",
        leftController: "knuckles",
        timestamp: new Date("2024-07-01T00:00:00.000Z"),
      },
    },
    {
      name: "handles empty modifiers and null controllers",
      row: baseRow({
        medals: 0,
        modifiers: null,
        missedNotes: 0,
        badCuts: 0,
        rightController: null,
        leftController: null,
        score: 0,
        accuracy: 0,
      }),
      expected: {
        playerId: "medal-player",
        leaderboardId: 300,
        scoreId: 7001,
        difficulty: "ExpertPlus",
        characteristic: "Standard",
        score: 0,
        accuracy: 0,
        medals: 0,
        rank: 0,
        misses: 0,
        missedNotes: 0,
        badCuts: 0,
        maxCombo: 500,
        fullCombo: false,
        modifiers: [],
        playerInfo: null,
        hmd: "Valve Index",
        rightController: null,
        leftController: null,
        timestamp: new Date("2024-07-01T00:00:00.000Z"),
      },
    },
  ];

  for (const { name, row, expected } of cases) {
    test(name, () => {
      expect(scoreSaberMedalScoreRowToType(row)).toEqual(expected);
    });
  }
});

describe("scoreSaberScoreToMedalScore", () => {
  const beatLeaderScore = {
    playerId: "live-player",
    songHash: "hash",
    leaderboardId: "lb-1",
    scoreId: 1,
    difficulty: "Hard" as const,
    characteristic: "Standard" as const,
    pauses: 0,
    fcAccuracy: 1,
    fullCombo: true,
    handAccuracy: { left: 1, right: 1 },
    misses: { misses: 0, missedNotes: 0, bombCuts: 0, wallsHit: 0, badCuts: 0 },
    scoreImprovement: {
      score: 0,
      pauses: 0,
      misses: { misses: 0, missedNotes: 0, bombCuts: 0, wallsHit: 0, badCuts: 0 },
      handAccuracy: { left: 0, right: 0 },
    },
    savedReplay: false,
    timestamp: new Date("2024-07-02T00:00:00.000Z"),
  };

  const previousScore: ScoreSaberHistoryScore = {
    playerId: "live-player",
    leaderboardId: 301,
    scoreId: 7999,
    difficulty: "Hard",
    characteristic: "OneSaber",
    score: 850_000,
    accuracy: 0.9,
    pp: 180,
    weight: 0.7,
    rank: 20,
    misses: 2,
    missedNotes: 2,
    badCuts: 0,
    maxCombo: 240,
    fullCombo: false,
    modifiers: [],
    hmd: "Quest",
    rightController: "quest",
    leftController: "quest",
    playerInfo: {
      id: "live-player",
      avatar: "https://example.com/avatar.png",
    },
    change: {
      score: 1_000,
      accuracy: 0.01,
      misses: 0,
      missedNotes: 0,
      badCuts: 0,
      maxCombo: 1,
    },
    timestamp: new Date("2024-06-01T00:00:00.000Z"),
  };

  const cases: { name: string; score: ScoreSaberScore; expected: ScoreSaberMedalScore }[] = [
    {
      name: "maps live score with medals reset to zero",
      score: baseScore(),
      expected: {
        playerId: "live-player",
        leaderboardId: 301,
        scoreId: 8001,
        difficulty: "Hard",
        characteristic: "OneSaber",
        score: 900_000,
        accuracy: 0.95,
        medals: 0,
        rank: 12,
        misses: 4,
        missedNotes: 3,
        badCuts: 1,
        maxCombo: 250,
        fullCombo: true,
        modifiers: [Modifier.DA],
        hmd: "Quest",
        rightController: "quest",
        leftController: "quest",
        playerInfo: {
          id: "live-player",
          avatar: "https://example.com/avatar.png",
        },
        timestamp: new Date("2024-07-02T00:00:00.000Z"),
      },
    },
    {
      name: "preserves optional beatLeaderScore and previousScore",
      score: baseScore({ beatLeaderScore, previousScore }),
      expected: {
        playerId: "live-player",
        leaderboardId: 301,
        scoreId: 8001,
        difficulty: "Hard",
        characteristic: "OneSaber",
        score: 900_000,
        accuracy: 0.95,
        medals: 0,
        rank: 12,
        misses: 4,
        missedNotes: 3,
        badCuts: 1,
        maxCombo: 250,
        fullCombo: true,
        modifiers: [Modifier.DA],
        hmd: "Quest",
        rightController: "quest",
        leftController: "quest",
        playerInfo: {
          id: "live-player",
          avatar: "https://example.com/avatar.png",
        },
        beatLeaderScore,
        previousScore,
        timestamp: new Date("2024-07-02T00:00:00.000Z"),
      },
    },
    {
      name: "nulls playerInfo when absent and keeps valid modifiers",
      score: baseScore({
        playerInfo: undefined,
        modifiers: [Modifier.NF],
        rank: 0,
        missedNotes: 0,
        badCuts: 0,
        hmd: undefined,
        rightController: null,
        leftController: null,
      }),
      expected: {
        playerId: "live-player",
        leaderboardId: 301,
        scoreId: 8001,
        difficulty: "Hard",
        characteristic: "OneSaber",
        score: 900_000,
        accuracy: 0.95,
        medals: 0,
        rank: 0,
        misses: 0,
        missedNotes: 0,
        badCuts: 0,
        maxCombo: 250,
        fullCombo: true,
        modifiers: [Modifier.NF],
        hmd: null,
        rightController: null,
        leftController: null,
        playerInfo: null,
        timestamp: new Date("2024-07-02T00:00:00.000Z"),
      },
    },
  ];

  for (const { name, score, expected } of cases) {
    test(name, () => {
      expect(scoreSaberScoreToMedalScore(score)).toEqual(expected);
    });
  }
});
