import { describe, expect, it } from "bun:test";
import type { ChatToolContext } from "../chat-tool-context";
import {
  MAX_TOOL_ROWS,
  capRows,
  resolvePlayerId,
  summarizeHistoryChange,
  trimPlayerHistoryEntry,
  trimPlayerProfile,
  trimPlayerScore,
  trimPlayerSummary,
} from "./player-tool-results";

const linkedContext: ChatToolContext = {
  userId: "user-1",
  userName: "Alice",
  playerId: "76561198000000000",
  realmId: 1,
};

const unlinkedContext: ChatToolContext = {
  userId: "user-2",
  userName: "Bob",
  playerId: null,
  realmId: 1,
};

describe("resolvePlayerId", () => {
  it("falls back to the signed-in user's linked player", () => {
    expect(resolvePlayerId(linkedContext, undefined)).toEqual({
      ok: true,
      playerId: "76561198000000000",
    });
  });

  it("prefers an explicitly requested player", () => {
    expect(resolvePlayerId(linkedContext, "123")).toEqual({ ok: true, playerId: "123" });
  });

  it("falls back to the linked player for a blank requested id", () => {
    expect(resolvePlayerId(linkedContext, "   ")).toEqual({
      ok: true,
      playerId: "76561198000000000",
    });
  });

  it("tells the model to ask for a player when neither id exists", () => {
    const result = resolvePlayerId(unlinkedContext, undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("searchPlayers");
      expect(result.error).toContain("Ask the user");
    }
  });
});

describe("trimPlayerSummary", () => {
  it("keeps only the id, name, ranks, pp and medal fields", () => {
    const trimmed = trimPlayerSummary({
      id: "123",
      name: "Alice",
      country: "SE",
      rank: 10,
      countryRank: 1,
      pp: 12000.5,
      medals: 42,
      medalsRank: 7,
      medalsCountryRank: 1,
      inactive: false,
      banned: false,
    });

    expect(trimmed).toEqual({
      id: "123",
      name: "Alice",
      country: "SE",
      rank: 10,
      countryRank: 1,
      pp: 12000.5,
      medals: 42,
      medalsRank: 7,
      medalsCountryRank: 1,
      inactive: false,
      banned: false,
    });
  });
});

describe("trimPlayerProfile", () => {
  it("adds accuracy, score counts and ISO dates without raw fields", () => {
    const trimmed = trimPlayerProfile({
      id: "123",
      name: "Alice",
      country: "SE",
      rank: 10,
      countryRank: 1,
      pp: 12000.5,
      medals: 42,
      medalsRank: 7,
      medalsCountryRank: 1,
      inactive: false,
      banned: false,
      topPp: 450.2,
      joinedDate: new Date("2020-01-02T03:04:05.000Z"),
      trackedSince: new Date("2021-02-03T04:05:06.000Z"),
      statistics: {
        averageRankedAccuracy: 92.5,
        rankedScores: 400,
        unrankedScores: 50,
        totalScores: 450,
      },
    });

    expect(trimmed.averageRankedAccuracy).toBe(92.5);
    expect(trimmed.rankedScoreCount).toBe(400);
    expect(trimmed.unrankedScoreCount).toBe(50);
    expect(trimmed.totalScoreCount).toBe(450);
    expect(trimmed.topPp).toBe(450.2);
    expect(trimmed.joinedDate).toBe("2020-01-02T03:04:05.000Z");
    expect(trimmed.trackedSince).toBe("2021-02-03T04:05:06.000Z");
    expect(trimmed).not.toHaveProperty("statistics");
  });
});

describe("trimPlayerScore", () => {
  it("keeps map details, score values and an ISO timestamp", () => {
    const trimmed = trimPlayerScore({
      leaderboard: {
        id: 99,
        songName: "Ghost",
        songAuthorName: "Camellia",
        stars: 8.5,
        ranked: true,
        difficulty: {
          id: 1,
          stars: 8.5,
          difficulty: "ExpertPlus",
          characteristic: "Standard",
        },
      },
      score: {
        scoreId: 5,
        accuracy: 0.9,
        score: 1000,
        misses: 2,
        maxCombo: 500,
        fullCombo: false,
        pp: 300.2,
        timestamp: new Date("2026-01-02T03:04:05.000Z"),
      },
    });

    expect(trimmed).toEqual({
      leaderboardId: 99,
      mapName: "Ghost",
      mapper: "Camellia",
      difficulty: "ExpertPlus",
      characteristic: "Standard",
      stars: 8.5,
      ranked: true,
      scoreId: 5,
      accuracy: 0.9,
      score: 1000,
      pp: 300.2,
      medals: undefined,
      misses: 2,
      maxCombo: 500,
      fullCombo: false,
      timestamp: "2026-01-02T03:04:05.000Z",
    });
  });
});

describe("trimPlayerHistoryEntry", () => {
  it("keeps daily rank, pp and score fields", () => {
    expect(
      trimPlayerHistoryEntry({
        rank: 10,
        countryRank: 1,
        pp: 12000,
        medals: 42,
        averageRankedAccuracy: 92.5,
        rankedScores: 400,
        totalScores: 450,
      })
    ).toEqual({
      rank: 10,
      countryRank: 1,
      pp: 12000,
      medals: 42,
      averageRankedAccuracy: 92.5,
      rankedScores: 400,
      totalScores: 450,
    });
  });
});

describe("capRows", () => {
  it("caps a list at the tool row limit", () => {
    const rows = capRows(Array.from({ length: MAX_TOOL_ROWS + 5 }, (_, index) => index));

    expect(rows).toHaveLength(MAX_TOOL_ROWS);
    expect(rows[rows.length - 1]).toBe(MAX_TOOL_ROWS - 1);
  });
});

describe("summarizeHistoryChange", () => {
  const row = (date: string, pp: number, rank: number) => ({
    date,
    rank,
    countryRank: undefined,
    pp,
    medals: undefined,
    averageRankedAccuracy: undefined,
    rankedScores: undefined,
    totalScores: undefined,
  });

  it("diffs the newest row against the oldest", () => {
    expect(summarizeHistoryChange([row("2026-03-04", 1010.5, 90), row("2026-03-01", 1000, 100)])).toEqual({
      from: "2026-03-01",
      to: "2026-03-04",
      pp: 10.5,
      rank: -10,
      countryRank: null,
      medals: null,
      rankedScores: null,
    });
  });

  it("returns null with fewer than two rows", () => {
    expect(summarizeHistoryChange([row("2026-03-04", 1, 1)])).toBeNull();
    expect(summarizeHistoryChange([])).toBeNull();
  });
});

describe("resolvePlayerId precision loss", () => {
  it("maps an id that lost digits as a JSON number back to the linked player", () => {
    const lossy = String(Number("76561198000000074"));

    expect(lossy).not.toBe("76561198000000074");
    expect(resolvePlayerId({ ...linkedContext, playerId: "76561198000000074" }, lossy)).toEqual({
      ok: true,
      playerId: "76561198000000074",
    });
  });

  it("keeps a different player id as requested", () => {
    expect(resolvePlayerId({ ...linkedContext, playerId: "76561198000000074" }, "76561198111111111")).toEqual(
      {
        ok: true,
        playerId: "76561198111111111",
      }
    );
  });
});
