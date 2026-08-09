import { describe, expect, test } from "bun:test";
import { playerHistoryRowToType } from "../../../../src/db/converter/player-history";
import type { PlayerHistoryRow } from "../../../../src/db/schema";

function baseRow(overrides: Partial<PlayerHistoryRow> = {}): PlayerHistoryRow {
  return {
    id: 1,
    playerId: "player-1",
    date: new Date("2024-01-01T00:00:00.000Z"),
    rank: null,
    countryRank: null,
    medals: null,
    pp: null,
    plusOnePp: null,
    totalScore: null,
    totalRankedScore: null,
    rankedScores: null,
    unrankedScores: null,
    rankedScoresImproved: null,
    unrankedScoresImproved: null,
    totalRankedScores: null,
    totalUnrankedScores: null,
    totalScores: null,
    averageRankedAccuracy: null,
    averageUnrankedAccuracy: null,
    averageAccuracy: null,
    aPlays: null,
    sPlays: null,
    spPlays: null,
    ssPlays: null,
    sspPlays: null,
    godPlays: null,
    ...overrides,
  };
}

describe("playerHistoryRowToType", () => {
  const cases = [
    {
      name: "omits null fields",
      row: baseRow(),
      expected: {},
    },
    {
      name: "maps all non-null fields",
      row: baseRow({
        rank: 10,
        countryRank: 2,
        medals: 5,
        pp: 123.45,
        plusOnePp: 0.5,
        totalScore: 1_000_000,
        totalRankedScore: 900_000,
        rankedScores: 100,
        unrankedScores: 20,
        rankedScoresImproved: 3,
        unrankedScoresImproved: 1,
        totalRankedScores: 500,
        totalUnrankedScores: 50,
        totalScores: 550,
        averageRankedAccuracy: 0.95,
        averageUnrankedAccuracy: 0.8,
        averageAccuracy: 0.9,
        aPlays: 1,
        sPlays: 2,
        spPlays: 3,
        ssPlays: 4,
        sspPlays: 5,
        godPlays: 6,
      }),
      expected: {
        rank: 10,
        countryRank: 2,
        medals: 5,
        pp: 123.45,
        plusOnePp: 0.5,
        totalScore: 1_000_000,
        totalRankedScore: 900_000,
        rankedScores: 100,
        unrankedScores: 20,
        rankedScoresImproved: 3,
        unrankedScoresImproved: 1,
        totalRankedScores: 500,
        totalUnrankedScores: 50,
        totalScores: 550,
        averageRankedAccuracy: 0.95,
        averageUnrankedAccuracy: 0.8,
        averageAccuracy: 0.9,
        aPlays: 1,
        sPlays: 2,
        spPlays: 3,
        ssPlays: 4,
        sspPlays: 5,
        godPlays: 6,
      },
    },
    {
      name: "includes zero values",
      row: baseRow({ rank: 0, pp: 0, rankedScores: 0 }),
      expected: { rank: 0, pp: 0, rankedScores: 0 },
    },
    {
      name: "includes partial non-null subset",
      row: baseRow({ medals: 42, godPlays: 1 }),
      expected: { medals: 42, godPlays: 1 },
    },
  ] as const;

  for (const { name, row, expected } of cases) {
    test(name, () => {
      expect(playerHistoryRowToType(row)).toEqual(expected);
    });
  }
});
