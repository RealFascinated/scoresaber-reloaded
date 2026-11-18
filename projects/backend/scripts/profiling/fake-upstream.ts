import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { PlayerRefreshResponse } from "@ssr/common/schemas/response/player/player-refresh";
import type { ScoreSaberLeaderboardToken } from "@ssr/common/schemas/scoresaber/tokens/v1/leaderboard";
import type { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/schemas/scoresaber/tokens/v1/leaderboard-player-info";
import type { ScoreSaberLeaderboardScoresPageToken } from "@ssr/common/schemas/scoresaber/tokens/v1/leaderboard-scores-page";
import type { ScoreSaberPlayerScoresPageToken } from "@ssr/common/schemas/scoresaber/tokens/v1/player-scores-page";
import type { RankingRequestToken } from "@ssr/common/schemas/scoresaber/tokens/v1/ranking-request-token";
import type { ScoreSaberScoreToken } from "@ssr/common/schemas/scoresaber/tokens/v1/score";
import type { ScoreSaberV2LeaderboardScoresPageToken } from "@ssr/common/schemas/scoresaber/tokens/v2/leaderboard/leaderboard-scores-page";
import type {
  ScoreSaberV2LeaderboardPageToken,
  ScoreSaberV2LeaderboardsPageToken,
} from "@ssr/common/schemas/scoresaber/tokens/v2/leaderboard/leaderboards-page";
import type { ScoreSaberV2PlayerToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import type {
  ScoreSaberV2PlayerPageToken,
  ScoreSaberV2PlayersPageToken,
} from "@ssr/common/schemas/scoresaber/tokens/v2/player/players-page";
import type { ScoreSaberV2RealmToken } from "@ssr/common/schemas/scoresaber/tokens/v2/realm/realm";
import type { ScoreSaberV2RealmPpCurveToken } from "@ssr/common/schemas/scoresaber/tokens/v2/realm/realm-pp-curve";
import {
  COUNTRIES,
  DIFFICULTIES,
  DIFFICULTY_RAW,
  LEADERBOARDS,
  PLAYERS,
  leaderboardDifficultyIndex,
  leaderboardMaxScore,
  leaderboardPlays,
  leaderboardRanked,
  leaderboardStars,
  playerCountry,
  playerId,
  playerIndex,
  playerPp,
  scoreId,
  scorePlayerIndex,
  scorePp,
  scoreValue,
  songHash,
} from "./fake-data";

const PORT = Number(process.env.FAKE_UPSTREAM_PORT ?? 3128);
const DELAY_MS = Number(process.env.FAKE_UPSTREAM_DELAY_MS ?? 20);
const ERROR_RATE = Number(process.env.FAKE_UPSTREAM_ERROR_RATE ?? 0);
const SLOW_RATE = Number(process.env.FAKE_UPSTREAM_SLOW_RATE ?? 0);
const SLOW_MS = Number(process.env.FAKE_UPSTREAM_SLOW_MS ?? 3000);

const V1_SCORES_PER_PAGE = 12;
const V2_SCORES_PER_PAGE = 12;
const V2_PLAYERS_PER_PAGE = 50;
const V2_LEADERBOARDS_PER_PAGE = 20;
const PLAYER_SCORES_PER_PAGE = 20;
const MAX_ITEMS_PER_PAGE = 100;
const PLAYER_SCORE_CAP = 400;
const EPOCH_MS = Date.UTC(2023, 0, 1);

const HASH_TO_FIRST_ID = new Map<string, number>();

for (let id = 1; id <= LEADERBOARDS; id++) {
  const hash = songHash(id);
  if (!HASH_TO_FIRST_ID.has(hash)) {
    HASH_TO_FIRST_ID.set(hash, id);
  }
}

function avatarUrl(index: number) {
  return `https://cdn.example.com/avatar/${index}.jpg`;
}

function coverUrl(leaderboardId: number) {
  return `https://cdn.example.com/cover/${Math.ceil(leaderboardId / DIFFICULTIES.length)}.jpg`;
}

function isoAt(offsetMinutes: number) {
  return new Date(EPOCH_MS + offsetMinutes * 60_000).toISOString();
}

function notFound() {
  return new Response("not found", { status: 404 });
}

function numberParam(params: URLSearchParams, name: string, fallback: number) {
  const value = params.get(name);
  if (value == null) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

function pageParam(params: URLSearchParams) {
  return numberParam(params, "page", 1);
}

function limitParam(params: URLSearchParams, fallback: number) {
  return Math.min(numberParam(params, "limit", fallback), MAX_ITEMS_PER_PAGE);
}

function parsePlayerIndex(value: string) {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }
  const index = playerIndex(value);
  if (index < 1 || index > PLAYERS) {
    return undefined;
  }
  return index;
}

function parseLeaderboardId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > LEADERBOARDS) {
    return undefined;
  }
  return id;
}

function rankedLeaderboardId(position: number) {
  return Math.floor(position / 2) * 3 + (position % 2) + 1;
}

function leaderboardPlayerInfo(index: number) {
  return {
    id: playerId(index),
    name: `Player${index}`,
    profilePicture: avatarUrl(index),
    country: playerCountry(index),
    permissions: 0,
    badges: "",
    role: "",
  } satisfies ScoreSaberLeaderboardPlayerInfoToken;
}

function difficultyToken(leaderboardId: number) {
  const difficultyIndex = leaderboardDifficultyIndex(leaderboardId);
  return {
    leaderboardId,
    difficulty: DIFFICULTY_RAW[difficultyIndex],
    gameMode: "SoloStandard",
    difficultyRaw: DIFFICULTIES[difficultyIndex],
  };
}

function siblingDifficultyTokens(leaderboardId: number) {
  const firstId = leaderboardId - leaderboardDifficultyIndex(leaderboardId);
  return DIFFICULTIES.map((_, offset) => difficultyToken(firstId + offset));
}

function leaderboardToken(leaderboardId: number, playerScore: ScoreSaberScoreToken | null) {
  const song = Math.ceil(leaderboardId / DIFFICULTIES.length);
  const ranked = leaderboardRanked(leaderboardId);
  return {
    id: leaderboardId,
    songHash: songHash(leaderboardId),
    songName: `Song ${song}`,
    songSubName: "",
    songAuthorName: `Artist ${song % 500}`,
    levelAuthorName: `Mapper ${song % 300}`,
    difficulty: difficultyToken(leaderboardId),
    maxScore: leaderboardMaxScore(leaderboardId),
    maxScoreEx: leaderboardMaxScore(leaderboardId),
    createdDate: isoAt(leaderboardId),
    rankedDate: ranked ? isoAt(leaderboardId + 60) : null,
    qualifiedDate: null,
    lovedDate: null,
    ranked,
    qualified: false,
    loved: false,
    maxPP: leaderboardStars(leaderboardId) * 42,
    stars: leaderboardStars(leaderboardId),
    positiveModifiers: true,
    playerScore,
    plays: leaderboardPlays(leaderboardId),
    dailyPlays: Math.ceil(leaderboardPlays(leaderboardId) / 30),
    coverImage: coverUrl(leaderboardId),
    difficulties: siblingDifficultyTokens(leaderboardId),
  } satisfies ScoreSaberLeaderboardToken;
}

function scoreToken(leaderboardId: number, rank: number, index: number) {
  const baseScore = scoreValue(leaderboardId, rank);
  const pp = scorePp(leaderboardId, rank);
  return {
    id: scoreId(leaderboardId, rank),
    leaderboardPlayerInfo: leaderboardPlayerInfo(index),
    rank,
    baseScore,
    modifiedScore: baseScore,
    pp,
    weight: 1,
    modifiers: "",
    multiplier: 1,
    badCuts: 0,
    missedNotes: 0,
    maxCombo: leaderboardMaxScore(leaderboardId) % 1000,
    fullCombo: true,
    hmd: 32,
    hasReplay: false,
    timeSet: isoAt(leaderboardId * 10 + rank),
    deviceHmd: "Quest 3",
    deviceControllerLeft: "Touch",
    deviceControllerRight: "Touch",
  } satisfies ScoreSaberScoreToken;
}

function leaderboardScoresPageToken(leaderboardId: number, page: number) {
  const total = leaderboardPlays(leaderboardId);
  const first = (page - 1) * V1_SCORES_PER_PAGE + 1;
  const scores = [];
  for (let rank = first; rank < first + V1_SCORES_PER_PAGE && rank <= total; rank++) {
    scores.push(scoreToken(leaderboardId, rank, scorePlayerIndex(leaderboardId, rank)));
  }
  return {
    scores,
    metadata: {
      total,
      page,
      itemsPerPage: V1_SCORES_PER_PAGE,
    },
  } satisfies ScoreSaberLeaderboardScoresPageToken;
}

function leaderboardScoresV2PageToken(leaderboardId: number, page: number, pageSize: number) {
  const total = leaderboardPlays(leaderboardId);
  const first = (page - 1) * pageSize + 1;
  const data = [];
  for (let rank = first; rank < first + pageSize && rank <= total; rank++) {
    data.push({
      id: scoreId(leaderboardId, rank),
      pp: scorePp(leaderboardId, rank),
      personalBest: true,
      player: {
        id: playerId(scorePlayerIndex(leaderboardId, rank)),
      },
    });
  }
  return {
    data,
    metadata: {
      page,
      itemsPerPage: pageSize,
      totalItems: total,
      totalPages: Math.ceil(total / pageSize),
    },
  } satisfies ScoreSaberV2LeaderboardScoresPageToken;
}

function playerBase(index: number) {
  return {
    id: playerId(index),
    name: `Player${index}`,
    playerNameInGame: `Player${index}`,
    country: playerCountry(index),
    role: null,
    avatar: avatarUrl(index),
    avatarVersion: 1,
    permissions: 0,
    banned: false,
    silenced: false,
    inactive: false,
  };
}

function playerStats(index: number) {
  return {
    realmId: DEFAULT_REALM_ID,
    realmName: "Default",
    rank: index,
    countryRank: Math.ceil(index / 16),
    rankChange: null,
    totalPP: playerPp(index),
    plusOnePP: null,
    totalScore: String(index * 1_234_567 + 10_000_000),
    totalRankedScore: String(index * 987_654 + 9_000_000),
    totalPlayedLeaderboards: PLAYER_SCORE_CAP,
    totalPlayedRankedLeaderboards: PLAYER_SCORE_CAP - Math.floor(PLAYER_SCORE_CAP / 3),
    totalSubmittedPlays: PLAYER_SCORE_CAP,
    totalReplayViews: 0,
    averageAccuracy: 0.9,
    weightedAverageAccuracy: 0.9,
    completionAccuracy: 0.9,
    device: {
      hmd: "Quest 3",
      controllerLeft: "Touch",
      controllerRight: "Touch",
    },
  };
}

function playerPageToken(index: number) {
  return {
    ...playerBase(index),
    stats: playerStats(index),
  } satisfies ScoreSaberV2PlayerPageToken;
}

function playerToken(index: number) {
  return {
    ...playerBase(index),
    stats: playerStats(index),
    bio: null,
    vanity: null,
    profileCustomization: {
      backgroundImage: null,
      backgroundImageVersion: null,
      accentColor: null,
      accentForegroundColor: null,
      accentForegroundActiveColor: null,
      supporterNameColorEnabled: false,
      badgeOrder: null,
      badgeComments: null,
      statOrder: null,
      enabledStatIds: null,
      chartMetricIds: null,
      sectionOrder: null,
    },
    createdAt: isoAt(index),
    lastSeenAt: isoAt(index + 60),
    badges: [],
    pinnedScores: [],
    followers: 0,
    following: 0,
  } satisfies ScoreSaberV2PlayerToken;
}

function searchPlayerIndex(search: string) {
  const nameMatch = search.match(/^player(\d+)$/i);
  if (nameMatch) {
    const index = Number(nameMatch[1]);
    if (Number.isInteger(index) && index >= 1 && index <= PLAYERS) {
      return index;
    }
    return undefined;
  }
  return parsePlayerIndex(search);
}

function countryPlayerPage(country: string, page: number, limit: number) {
  const position = COUNTRIES.indexOf(country);
  if (position < 0) {
    return { indices: [] as number[], total: 0 };
  }
  const step = COUNTRIES.length;
  const first = position === 0 ? step : position;
  const total = position === 0 ? Math.floor(PLAYERS / step) : Math.floor((PLAYERS - position) / step) + 1;
  const start = (page - 1) * limit;
  const indices: number[] = [];
  for (let offset = start; offset < Math.min(total, start + limit); offset++) {
    indices.push(first + offset * step);
  }
  return { indices, total };
}

function playersPageToken(params: URLSearchParams) {
  const page = pageParam(params);
  const limit = limitParam(params, V2_PLAYERS_PER_PAGE);
  const search = params.get("search")?.trim() ?? "";
  const country = params.get("countries")?.split(",")[0]?.trim().toUpperCase() ?? "";

  if (search.length > 0) {
    const index = searchPlayerIndex(search);
    const data = index === undefined ? [] : [playerPageToken(index)];
    return {
      data,
      metadata: {
        page: 1,
        itemsPerPage: limit,
        totalItems: data.length,
        totalPages: data.length > 0 ? 1 : 0,
      },
    } satisfies ScoreSaberV2PlayersPageToken;
  }

  if (country.length > 0) {
    const { indices, total } = countryPlayerPage(country, page, limit);
    return {
      data: indices.map(index => playerPageToken(index)),
      metadata: {
        page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    } satisfies ScoreSaberV2PlayersPageToken;
  }

  const start = (page - 1) * limit + 1;
  const data = [];
  for (let index = start; index <= Math.min(PLAYERS, start + limit - 1); index++) {
    data.push(playerPageToken(index));
  }
  return {
    data,
    metadata: {
      page,
      itemsPerPage: limit,
      totalItems: PLAYERS,
      totalPages: Math.ceil(PLAYERS / limit),
    },
  } satisfies ScoreSaberV2PlayersPageToken;
}

function playerScoreLeaderboardIds(index: number, count: number) {
  const ids: number[] = [];
  for (let k = 0; k < count; k++) {
    ids.push(((index * 31 + k * 97) % LEADERBOARDS) + 1);
  }
  return ids;
}

function playerScoresPageToken(index: number, params: URLSearchParams) {
  const page = pageParam(params);
  const limit = limitParam(params, PLAYER_SCORES_PER_PAGE);
  const sort = params.get("sort") ?? "recent";
  const count = Math.min(limit * page, PLAYER_SCORE_CAP);
  const entries = playerScoreLeaderboardIds(index, count).map(leaderboardId => {
    const rank = ((index * 7919 + leaderboardId * 104729) % leaderboardPlays(leaderboardId)) + 1;
    return {
      leaderboardId,
      score: scoreToken(leaderboardId, rank, index),
    };
  });

  if (sort === "top") {
    entries.sort((a, b) => b.score.pp - a.score.pp);
  } else {
    entries.sort((a, b) => Date.parse(b.score.timeSet) - Date.parse(a.score.timeSet));
  }

  return {
    playerScores: entries.slice((page - 1) * limit, page * limit).map(entry => ({
      score: entry.score,
      leaderboard: leaderboardToken(entry.leaderboardId, entry.score),
    })),
    metadata: {
      total: PLAYER_SCORE_CAP,
      page,
      itemsPerPage: limit,
    },
  } satisfies ScoreSaberPlayerScoresPageToken;
}

function leaderboardPageToken(leaderboardId: number) {
  const song = Math.ceil(leaderboardId / DIFFICULTIES.length);
  const difficultyIndex = leaderboardDifficultyIndex(leaderboardId);
  const ranked = leaderboardRanked(leaderboardId);
  return {
    id: leaderboardId,
    map: {
      id: song,
      hash: songHash(leaderboardId),
      bsid: String(song),
      songName: `Song ${song}`,
      songSubName: "",
      songAuthorName: `Artist ${song % 500}`,
      levelAuthorName: `Mapper ${song % 300}`,
      bpm: 120 + (song % 100),
      coverUrl: coverUrl(leaderboardId),
      verified: true,
    },
    difficulty: {
      id: leaderboardId,
      difficulty: DIFFICULTY_RAW[difficultyIndex],
      rawDifficulty: DIFFICULTIES[difficultyIndex],
      gameMode: "SoloStandard",
    },
    maxScore: leaderboardMaxScore(leaderboardId),
    totalScores: leaderboardPlays(leaderboardId),
    dailyScores: Math.ceil(leaderboardPlays(leaderboardId) / 30),
    createdAt: isoAt(leaderboardId),
    realm: {
      realmId: DEFAULT_REALM_ID,
      realmName: "Default",
      leaderboardStatus: ranked ? "RANKED" : "UNRANKED",
      positiveModifiers: true,
      stars: leaderboardStars(leaderboardId),
      rankedAt: ranked ? isoAt(leaderboardId + 60) : null,
      qualifiedAt: null,
      lovedAt: null,
    },
  } satisfies ScoreSaberV2LeaderboardPageToken;
}

function leaderboardStatusTotal(status: string) {
  if (status === "RANKED") {
    return LEADERBOARDS - Math.floor(LEADERBOARDS / 3);
  }
  if (status === "UNRANKED") {
    return Math.floor(LEADERBOARDS / 3);
  }
  if (status === "QUALIFIED" || status === "LOVED") {
    return 0;
  }
  return LEADERBOARDS;
}

function leaderboardIdAt(status: string, position: number) {
  if (status === "RANKED") {
    return rankedLeaderboardId(position);
  }
  if (status === "UNRANKED") {
    return (position + 1) * 3;
  }
  return position + 1;
}

function leaderboardsPageToken(params: URLSearchParams) {
  const page = pageParam(params);
  const limit = limitParam(params, V2_LEADERBOARDS_PER_PAGE);
  const status = params.get("status")?.split(",")[0]?.trim().toUpperCase() ?? "";
  const total = leaderboardStatusTotal(status);
  const start = (page - 1) * limit;
  const data = [];
  for (let offset = start; offset < Math.min(total, start + limit); offset++) {
    data.push(leaderboardPageToken(leaderboardIdAt(status, offset)));
  }
  return {
    data,
    metadata: {
      page,
      itemsPerPage: limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    },
  } satisfies ScoreSaberV2LeaderboardsPageToken;
}

function rankingRequestToken(position: number) {
  const leaderboardId = rankedLeaderboardId(position);
  return {
    requestId: leaderboardId * 100 + 1,
    weight: 1,
    leaderboardInfo: leaderboardToken(leaderboardId, null),
    created_at: isoAt(position),
    totalRankVotes: {
      upvotes: position + 1,
      downvotes: 0,
      myVote: false,
      neutral: 0,
    },
    totalQATVotes: {
      upvotes: position + 1,
      downvotes: 0,
      myVote: false,
      neutral: 0,
    },
    difficultyCount: DIFFICULTIES.length,
  } satisfies RankingRequestToken;
}

function realmTokens() {
  return [
    {
      id: DEFAULT_REALM_ID,
      name: "Default",
      startDate: isoAt(0),
      endDate: null,
      isAcceptingScores: true,
      hasPP: true,
      hasHistory: true,
      decayFactor: 0.965,
    },
  ] satisfies ScoreSaberV2RealmToken[];
}

function ppCurveToken() {
  const curve: [number, number][] = [];
  for (let step = 0; step <= 10; step++) {
    const accuracy = step / 10;
    curve.push([accuracy, Math.round(accuracy * accuracy * 10_000) / 100]);
  }
  return {
    curve,
    positiveModifierCurve: curve,
  } satisfies ScoreSaberV2RealmPpCurveToken;
}

function route(target: URL) {
  const params = target.searchParams;
  const pathname = target.pathname;

  if (pathname === "/api/v2/players/count") {
    return Response.json({ count: PLAYERS });
  }

  if (pathname === "/api/v2/players") {
    return Response.json(playersPageToken(params));
  }

  const playerMatch = pathname.match(/^\/api\/v2\/players\/([^/]+)$/);
  if (playerMatch) {
    const index = parsePlayerIndex(playerMatch[1]);
    if (index === undefined) {
      return notFound();
    }
    return Response.json(playerToken(index));
  }

  const playerScoresMatch = pathname.match(/^\/api\/player\/([^/]+)\/scores$/);
  if (playerScoresMatch) {
    const index = parsePlayerIndex(playerScoresMatch[1]);
    if (index === undefined) {
      return notFound();
    }
    return Response.json(playerScoresPageToken(index, params));
  }

  const refreshMatch = pathname.match(/^\/api\/user\/([^/]+)\/refresh$/);
  if (refreshMatch) {
    const index = parsePlayerIndex(refreshMatch[1]);
    if (index === undefined) {
      return notFound();
    }
    return Response.json({ result: true } satisfies PlayerRefreshResponse);
  }

  const leaderboardInfoMatch = pathname.match(/^\/api\/leaderboard\/by-id\/(\d+)\/info$/);
  if (leaderboardInfoMatch) {
    const id = parseLeaderboardId(leaderboardInfoMatch[1]);
    if (id === undefined) {
      return notFound();
    }
    return Response.json(leaderboardToken(id, null));
  }

  const leaderboardScoresMatch = pathname.match(/^\/api\/leaderboard\/by-id\/(\d+)\/scores$/);
  if (leaderboardScoresMatch) {
    const id = parseLeaderboardId(leaderboardScoresMatch[1]);
    if (id === undefined) {
      return notFound();
    }
    return Response.json(leaderboardScoresPageToken(id, pageParam(params)));
  }

  const leaderboardByHashMatch = pathname.match(/^\/api\/leaderboard\/by-hash\/([^/]+)\/info$/);
  if (leaderboardByHashMatch) {
    const firstId = HASH_TO_FIRST_ID.get(leaderboardByHashMatch[1].toUpperCase());
    if (firstId === undefined) {
      return notFound();
    }
    const difficulty = numberParam(params, "difficulty", DIFFICULTY_RAW[0]);
    const offset = DIFFICULTY_RAW.findIndex(raw => raw === difficulty);
    if (offset < 0) {
      return notFound();
    }
    return Response.json(leaderboardToken(firstId + offset, null));
  }

  const rankingRequestsMatch = pathname.match(/^\/api\/ranking\/requests\/(top|belowTop)$/);
  if (rankingRequestsMatch) {
    const start = rankingRequestsMatch[1] === "top" ? 0 : 25;
    const data = [];
    for (let position = start; position < start + 25; position++) {
      data.push(rankingRequestToken(position));
    }
    return Response.json(data);
  }

  if (pathname === "/api/v2/leaderboards") {
    return Response.json(leaderboardsPageToken(params));
  }

  const leaderboardScoresV2Match = pathname.match(/^\/api\/v2\/leaderboards\/(\d+)\/scores$/);
  if (leaderboardScoresV2Match) {
    const id = parseLeaderboardId(leaderboardScoresV2Match[1]);
    if (id === undefined) {
      return notFound();
    }
    return Response.json(
      leaderboardScoresV2PageToken(id, pageParam(params), limitParam(params, V2_SCORES_PER_PAGE))
    );
  }

  if (pathname === "/api/v2/realms") {
    return Response.json(realmTokens());
  }

  const realmPpCurveMatch = pathname.match(/^\/api\/v2\/realms\/(\d+)\/pp-curve$/);
  if (realmPpCurveMatch) {
    if (Number(realmPpCurveMatch[1]) !== DEFAULT_REALM_ID) {
      return notFound();
    }
    return Response.json(ppCurveToken());
  }

  return undefined;
}

Bun.serve({
  port: PORT,
  async fetch(request) {
    await Bun.sleep(DELAY_MS);

    if (SLOW_RATE > 0 && Math.random() < SLOW_RATE) {
      await Bun.sleep(SLOW_MS);
    }

    if (ERROR_RATE > 0 && Math.random() < ERROR_RATE) {
      return new Response("upstream error", { status: 500 });
    }

    let target: URL;
    try {
      target = new URL(decodeURIComponent(new URL(request.url).pathname.slice(1)));
    } catch {
      return notFound();
    }

    return route(target) ?? notFound();
  },
});

console.log(
  `fake upstream on :${PORT} delay=${DELAY_MS}ms errorRate=${ERROR_RATE} slowRate=${SLOW_RATE} slowMs=${SLOW_MS}ms`
);
