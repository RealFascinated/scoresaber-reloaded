import { describe, expect, test } from "bun:test";
import { DetailType } from "@ssr/common/detail-type";
import {
  beatLeaderScoreByIdCacheKey,
  beatLeaderScoreBySongCacheKey,
  beatSaverMapCacheKey,
  cachedPlayerTokenCacheKey,
  miniRankingCacheKey,
  normalizeSongHash,
  playerCacheKey,
  playerExistsCacheKey,
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
      expect(playerCacheKey(id, type)).toBe(expected);
    });
  }
});

describe("playerExistsCacheKey", () => {
  const cases = [
    { name: "normal id", id: "abc123", expected: "scoresaber:player:abc123:exists" },
    { name: "empty id", id: "", expected: "scoresaber:player::exists" },
  ] as const;

  for (const { name, id, expected } of cases) {
    test(name, () => {
      expect(playerExistsCacheKey(id)).toBe(expected);
    });
  }
});

describe("cachedPlayerTokenCacheKey", () => {
  const cases = [
    { name: "normal id", id: "token-player", expected: "scoresaber:cached-player:token-player" },
    { name: "empty id", id: "", expected: "scoresaber:cached-player:" },
  ] as const;

  for (const { name, id, expected } of cases) {
    test(name, () => {
      expect(cachedPlayerTokenCacheKey(id)).toBe(expected);
    });
  }
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
      playerId: "p1",
      type: "global" as const,
      page: 1,
      country: undefined,
      expected: "scoresaber:mini-ranking:p1:global:1",
    },
    {
      name: "country ranking with country",
      playerId: "p2",
      type: "country" as const,
      page: 3,
      country: "US",
      expected: "scoresaber:mini-ranking:p2:country:US:3",
    },
    {
      name: "country ranking without country",
      playerId: "p3",
      type: "country" as const,
      page: 0,
      country: undefined,
      expected: "scoresaber:mini-ranking:p3:country::0",
    },
    {
      name: "country ranking with empty country",
      playerId: "p4",
      type: "country" as const,
      page: 2,
      country: "",
      expected: "scoresaber:mini-ranking:p4:country::2",
    },
    {
      name: "medals ranking",
      playerId: "p5",
      type: "medals" as const,
      page: 5,
      country: "ignored",
      expected: "scoresaber:mini-ranking:p5:medals:5",
    },
  ] as const;

  for (const { name, playerId, type, page, country, expected } of cases) {
    test(name, () => {
      expect(miniRankingCacheKey(playerId, type, page, country)).toBe(expected);
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
