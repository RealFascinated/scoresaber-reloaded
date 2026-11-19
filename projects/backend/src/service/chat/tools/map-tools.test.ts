import {
  CreatePlaylistInputSchema,
  GetLeaderboardInputSchema,
  GetSiteLinkInputSchema,
} from "@ssr/common/schemas/chat/tools/map-tools";
import { checkSchema } from "@ssr/common/schemas/parse";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { describe, expect, it } from "bun:test";
import type { ChatToolContext } from "../chat-tool-context";
import {
  MAX_TOOL_ROWS,
  getSiteLinkUrl,
  trimLeaderboards,
  trimLeaderboardScore,
  trimRankedBatch,
  trimRealm,
} from "./map-tool-utils";
import { resolvePlayerId } from "./player-tool-results";

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

function makeLeaderboard(id: number) {
  return {
    id,
    fullName: "Song — Mapper [ExpertPlus]",
    songHash: "ABC123",
    songName: "Song",
    songSubName: "",
    songAuthorName: "Artist",
    songArt: "https://example.com/huge-cover.png",
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
}

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
    weight: 1,
    rank: 4,
    misses: 0,
    missedNotes: 0,
    badCuts: 1,
    maxCombo: 500,
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

describe("tool input schemas", () => {
  it("accepts the three site link kinds and rejects anything else", () => {
    expect(checkSchema(GetSiteLinkInputSchema, { kind: "player", id: "1" })).toBe(true);
    expect(checkSchema(GetSiteLinkInputSchema, { kind: "score", id: "2" })).toBe(true);
    expect(checkSchema(GetSiteLinkInputSchema, { kind: "realm", id: "3" })).toBe(false);
  });

  it("requires a positive leaderboard id", () => {
    expect(checkSchema(GetLeaderboardInputSchema, { leaderboardId: 1 })).toBe(true);
    expect(checkSchema(GetLeaderboardInputSchema, { leaderboardId: 0 })).toBe(false);
  });

  it("rejects empty playlists and more than 100 maps", () => {
    const map = { leaderboardId: 1 };
    expect(checkSchema(CreatePlaylistInputSchema, { title: "Maps", maps: [map] })).toBe(true);
    expect(checkSchema(CreatePlaylistInputSchema, { title: "Maps", maps: [] })).toBe(false);
    expect(
      checkSchema(CreatePlaylistInputSchema, {
        title: "Maps",
        maps: Array.from({ length: 101 }, (_, index) => ({ leaderboardId: index + 1 })),
      })
    ).toBe(false);
  });

  it("accepts hash entries with a difficulty and optional characteristic", () => {
    expect(
      checkSchema(CreatePlaylistInputSchema, {
        title: "Hash maps",
        maps: [{ songHash: "ABCDEF0123456789ABCDEF0123456789ABCDEF01", difficulty: "Expert" }],
      })
    ).toBe(true);
    expect(
      checkSchema(CreatePlaylistInputSchema, {
        title: "Hash maps",
        maps: [{ songHash: "not-a-hash", difficulty: "Expert" }],
      })
    ).toBe(false);
  });
});

describe("getSiteLinkUrl", () => {
  it("builds player, leaderboard and score paths under the website URL", () => {
    expect(getSiteLinkUrl("player", "76561198000000000", "https://example.com")).toBe(
      "https://example.com/player/76561198000000000"
    );
    expect(getSiteLinkUrl("leaderboard", "1234", "https://example.com/")).toBe(
      "https://example.com/leaderboard/1234"
    );
    expect(getSiteLinkUrl("score", "999", "https://example.com")).toBe("https://example.com/score/999");
  });

  it("encodes ids so they cannot break the path", () => {
    expect(getSiteLinkUrl("player", "a/b c", "https://example.com")).toBe(
      "https://example.com/player/a%2Fb%20c"
    );
  });
});

describe("resolvePlayerId", () => {
  it("defaults to the signed-in user's linked player", () => {
    expect(resolvePlayerId(linkedContext, undefined)).toEqual({
      ok: true,
      playerId: "76561198000000000",
    });
  });

  it("prefers an explicitly requested player", () => {
    expect(resolvePlayerId(linkedContext, "123")).toEqual({ ok: true, playerId: "123" });
  });

  it("tells the model to ask for a player when nothing is linked", () => {
    const result = resolvePlayerId(unlinkedContext, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Ask the user");
    }
  });
});

describe("leaderboard trimming", () => {
  it("drops cover art and keeps the fields the model needs", () => {
    const result = trimLeaderboards([makeLeaderboard(1)]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      leaderboardId: 1,
      songName: "Song",
      songSubName: "",
      songAuthorName: "Artist",
      levelAuthorName: "Mapper",
      songHash: "ABC123",
      difficulty: "ExpertPlus",
      characteristic: "Standard",
      stars: 8.5,
      ranked: true,
      qualified: false,
      maxScore: 1000,
      plays: 12000,
    });
    expect("songArt" in result[0]).toBe(false);
    expect("timestamp" in result[0]).toBe(false);
  });

  it("caps long lists", () => {
    const leaderboards = Array.from({ length: MAX_TOOL_ROWS + 5 }, (_, index) => makeLeaderboard(index + 1));
    expect(trimLeaderboards(leaderboards, MAX_TOOL_ROWS)).toHaveLength(MAX_TOOL_ROWS);
  });
});

describe("score trimming", () => {
  it("keeps the player name and score facts", () => {
    const result = trimLeaderboardScore(
      makeScore({
        playerInfo: {
          id: "76561198000000000",
          name: "Alice",
          country: "GB",
          avatar: "https://example.com/avatar.png",
        },
      })
    );

    expect(result.playerName).toBe("Alice");
    expect(result.country).toBe("GB");
    expect(result.pp).toBe(300);
    expect(result.timestamp).toBe("2026-01-01T00:00:00.000Z");
  });

  it("leaves the player name undefined when the score has no player info", () => {
    const result = trimLeaderboardScore(makeScore());
    expect(result.playerName).toBeUndefined();
    expect(result.country).toBeUndefined();
  });
});

describe("ranked batch and realm trimming", () => {
  it("formats dates as ISO strings", () => {
    const result = trimRankedBatch({
      id: 7,
      name: "January 2026 Ranked Batch",
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
      endedAt: new Date("2026-01-03T00:00:00.000Z"),
      leaderboardCount: 12,
      newLeaderboardCount: 3,
      playerCount: 100,
      scoreCount: 1000,
      ppPending: false,
    });

    expect(result.startedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result.endedAt).toBe("2026-01-03T00:00:00.000Z");
    expect(result.rankedBatchId).toBe(7);
  });

  it("trims realms to the fields that pick a valid realm", () => {
    expect(
      trimRealm({
        id: 1,
        name: "Default",
        startDate: "2020-01-01T00:00:00.000Z",
        endDate: null,
        isAcceptingScores: true,
        hasPP: true,
        hasHistory: true,
        decayFactor: 0,
      })
    ).toEqual({
      realmId: 1,
      name: "Default",
      startDate: "2020-01-01T00:00:00.000Z",
      endDate: null,
      isAcceptingScores: true,
      hasPP: true,
    });
  });
});
