import { DetailType } from "@ssr/common/detail-type";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { describe, expect, test } from "bun:test";
import {
  beatLeaderScoreByIdCacheKey,
  beatLeaderScoreBySongCacheKey,
  beatSaverMapCacheKey,
  miniRankingCacheKey,
  normalizeSongHash,
  playerCacheKey,
  playerCacheKeyPrefix,
  playerCacheKeysPattern,
  rankingQueueLeaderboardsCacheKey,
  scoreHistoryGraphCacheKey,
  scoreSaberApiResponseCacheKey,
} from "../../../src/common/cache-keys";

describe("normalizeSongHash", () => {
  const cases = [
    { name: "lowercases hash", input: "ABCD1234", expected: "abcd1234" },
    { name: "trims whitespace", input: "  abcd1234  ", expected: "abcd1234" },
    { name: "empty string", input: "", expected: "" },
    { name: "already normalized", input: "deadbeef", expected: "deadbeef" },
  ] as const;

  for (const { name, input, expected } of cases) {
    test(name, () => {
      expect(normalizeSongHash(input)).toBe(expected);
    });
  }
});

describe("rankingQueueLeaderboardsCacheKey", () => {
  test("is the expected constant", () => {
    expect(rankingQueueLeaderboardsCacheKey).toBe("leaderboard:ranking-queue-maps");
  });
});

describe("playerCacheKey", () => {
  const cases: { name: string; id: string; type: DetailType; expected: string }[] = [
    { name: "basic detail", id: "player-1", type: "basic", expected: "scoresaber:player:player-1:basic" },
    { name: "full detail", id: "player-2", type: "full", expected: "scoresaber:player:player-2:full" },
    { name: "empty id", id: "", type: "basic", expected: "scoresaber:player::basic" },
  ];

  for (const { name, id, type, expected } of cases) {
    test(name, () => {
      expect(playerCacheKey(id, type, DEFAULT_REALM_ID)).toBe(expected);
    });
  }
});

describe("playerCacheKeyPrefix", () => {
  test("covers every realm and detail type of the same player", () => {
    const prefix = playerCacheKeyPrefix("player-1");
    expect(playerCacheKey("player-1", "basic", DEFAULT_REALM_ID).startsWith(prefix)).toBe(true);
    expect(playerCacheKey("player-1", "full", 2).startsWith(prefix)).toBe(true);
  });

  test("does not cover a different player whose id starts with the same characters", () => {
    expect(
      playerCacheKey("player-10", "basic", DEFAULT_REALM_ID).startsWith(playerCacheKeyPrefix("player-1"))
    ).toBe(false);
  });
});

describe("playerCacheKeysPattern", () => {
  test("matches every player cache key", () => {
    const prefix = playerCacheKeysPattern.slice(0, -1);
    expect(playerCacheKey("player-1", "basic", DEFAULT_REALM_ID).startsWith(prefix)).toBe(true);
    expect(playerCacheKey("player-2", "full", 2).startsWith(prefix)).toBe(true);
  });

  test("does not match mini-ranking keys", () => {
    const prefix = playerCacheKeysPattern.slice(0, -1);
    expect(miniRankingCacheKey("global", 1, undefined, DEFAULT_REALM_ID).startsWith(prefix)).toBe(false);
  });
});

describe("scoreSaberApiResponseCacheKey", () => {
  const cases = [
    { name: "normal hash", cacheHash: "req-abc", expected: "scoresaber:api-cache:req-abc" },
    { name: "empty hash", cacheHash: "", expected: "scoresaber:api-cache:" },
  ] as const;

  for (const { name, cacheHash, expected } of cases) {
    test(name, () => {
      expect(scoreSaberApiResponseCacheKey(cacheHash)).toBe(expected);
    });
  }
});

describe("miniRankingCacheKey", () => {
  const cases = [
    {
      name: "global ranking",
      type: "global" as const,
      page: 1,
      country: undefined,
      expected: "scoresaber:mini-ranking:global:1",
    },
    {
      name: "country ranking with country",
      type: "country" as const,
      page: 3,
      country: "US",
      expected: "scoresaber:mini-ranking:country:US:3",
    },
    {
      name: "country ranking without country",
      type: "country" as const,
      page: 0,
      country: undefined,
      expected: "scoresaber:mini-ranking:country::0",
    },
    {
      name: "country ranking with empty country",
      type: "country" as const,
      page: 2,
      country: "",
      expected: "scoresaber:mini-ranking:country::2",
    },
  ] as const;

  for (const { name, type, page, country, expected } of cases) {
    test(name, () => {
      expect(miniRankingCacheKey(type, page, country, DEFAULT_REALM_ID)).toBe(expected);
    });
  }
});

describe("beatSaverMapCacheKey", () => {
  const cases = [
    {
      name: "normalizes hash and difficulty/characteristic",
      hash: " ABCDEF12 ",
      difficulty: "ExpertPlus" as const,
      characteristic: "Standard" as const,
      expected: "beatsaver:abcdef12-expertplus-standard",
    },
    {
      name: "empty hash",
      hash: "",
      difficulty: "Easy" as const,
      characteristic: "OneSaber" as const,
      expected: "beatsaver:-easy-onesaber",
    },
  ] as const;

  for (const { name, hash, difficulty, characteristic, expected } of cases) {
    test(name, () => {
      expect(beatSaverMapCacheKey(hash, difficulty, characteristic)).toBe(expected);
    });
  }
});

describe("beatLeaderScoreByIdCacheKey", () => {
  const cases = [
    { name: "positive id", scoreId: 42, expected: "beatleader-score:42" },
    { name: "zero id", scoreId: 0, expected: "beatleader-score:0" },
    { name: "negative id", scoreId: -1, expected: "beatleader-score:-1" },
  ] as const;

  for (const { name, scoreId, expected } of cases) {
    test(name, () => {
      expect(beatLeaderScoreByIdCacheKey(scoreId)).toBe(expected);
    });
  }
});

describe("beatLeaderScoreBySongCacheKey", () => {
  const cases = [
    {
      name: "normalizes song hash",
      playerId: "pl1",
      songHash: " HASH01 ",
      songDifficulty: "Expert",
      songScore: 950000,
      expected: "beatleader-score:pl1-hash01-Expert-950000",
    },
    {
      name: "empty song hash",
      playerId: "pl2",
      songHash: "",
      songDifficulty: "Hard",
      songScore: 0,
      expected: "beatleader-score:pl2--Hard-0",
    },
  ] as const;

  for (const { name, playerId, songHash, songDifficulty, songScore, expected } of cases) {
    test(name, () => {
      expect(beatLeaderScoreBySongCacheKey(playerId, songHash, songDifficulty, songScore)).toBe(expected);
    });
  }
});

describe("scoreHistoryGraphCacheKey", () => {
  const cases = [
    {
      name: "normal values",
      playerId: "player-a",
      leaderboardId: 1001,
      expected: "score-history-graph:player-a-1001",
    },
    {
      name: "empty player id",
      playerId: "",
      leaderboardId: 0,
      expected: "score-history-graph:-0",
    },
  ] as const;

  for (const { name, playerId, leaderboardId, expected } of cases) {
    test(name, () => {
      expect(scoreHistoryGraphCacheKey(playerId, leaderboardId)).toBe(expected);
    });
  }
});
