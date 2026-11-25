import { env } from "@ssr/common/env";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberV2LeaderboardPageToken } from "@ssr/common/schemas/scoresaber/tokens/v2/leaderboard/leaderboards-page";
import type { ScoreSaberV2PlayerToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import type { ScoreSaberV2ScoreResponseToken } from "@ssr/common/schemas/scoresaber/tokens/v2/score/score";
import { HttpResponse, http } from "msw";
import {
  INSERT_ACCOUNT_ID,
  TEST_AVATAR,
  TEST_LEADERBOARD_ID,
  TEST_PLAYER_ID,
  TEST_PLAYER_NAME,
  TEST_SCORE_ID,
  TEST_SONG_HASH,
  TEST_INACTIVE_PLAYER_ID,
  TEST_PLAYER_TWO_ID,
  TEST_PLAYER_TWO_NAME,
} from "./constants";
import { buildScoreSaberV2PlayerToken } from "./scoresaber.fixture";

const SCORESABER_HOST = "scoresaber.com";
const SCORESABER_API_PATH = "/api";
const PLAYERS_PAGE_SIZE = 50;

export type ScoreSaberApiRequest = {
  params: Record<string, string>;
  searchParams: URLSearchParams;
};

export type ScoreSaberApiResolver = (
  request: ScoreSaberApiRequest
) => Response | undefined | Promise<Response | undefined>;

function buildStats(rank: number, countryRank: number, totalPP: number, accuracy: number) {
  const stats: ScoreSaberV2PlayerToken["stats"] = {
    realmId: 1,
    realmName: "Steam",
    rank,
    countryRank,
    rankChange: null,
    totalPP,
    plusOnePP: 1,
    totalScore: String(totalPP * 10),
    totalRankedScore: String(totalPP * 10),
    totalPlayedLeaderboards: 1,
    totalPlayedRankedLeaderboards: 1,
    totalSubmittedPlays: 1,
    totalReplayViews: 0,
    averageAccuracy: accuracy,
    weightedAverageAccuracy: accuracy,
    completionAccuracy: accuracy,
    device: null,
  };
  return stats;
}

/** The players ScoreSaber knows about unless a test says otherwise. */
export const TEST_PLAYER_TOKENS: ScoreSaberV2PlayerToken[] = [
  buildScoreSaberV2PlayerToken(),
  buildScoreSaberV2PlayerToken({
    id: TEST_PLAYER_TWO_ID,
    name: TEST_PLAYER_TWO_NAME,
    playerNameInGame: TEST_PLAYER_TWO_NAME,
    stats: buildStats(200, 20, 80, 0.9),
  }),
  buildScoreSaberV2PlayerToken({
    id: TEST_INACTIVE_PLAYER_ID,
    name: "InactivePlayer",
    playerNameInGame: "InactivePlayer",
    inactive: true,
    stats: buildStats(500, 50, 50, 0.85),
  }),
  buildScoreSaberV2PlayerToken({
    id: INSERT_ACCOUNT_ID,
    name: "InsertAccount",
    playerNameInGame: "InsertAccount",
    stats: buildStats(300, 30, 60, 0.88),
  }),
];

function toPageToken(token: ScoreSaberV2PlayerToken) {
  return {
    id: token.id,
    name: token.name,
    playerNameInGame: token.playerNameInGame,
    country: token.country,
    role: token.role,
    avatar: token.avatar,
    avatarVersion: token.avatarVersion,
    permissions: token.permissions,
    banned: token.banned,
    silenced: token.silenced,
    inactive: token.inactive,
    stats: token.stats,
  };
}

function matchPath(template: string, pathname: string) {
  const expected = template.split("/").filter(Boolean);
  const actual = pathname.split("/").filter(Boolean);
  if (expected.length !== actual.length) {
    return undefined;
  }

  const params: Record<string, string> = {};
  for (const [index, part] of expected.entries()) {
    const segment = actual[index];
    if (part.startsWith(":")) {
      params[part.slice(1)] = decodeURIComponent(segment);
    } else if (part !== segment) {
      return undefined;
    }
  }
  return params;
}

function proxiedTarget(requestUrl: string) {
  const { pathname } = new URL(requestUrl);
  return new URL(decodeURIComponent(pathname.slice(1)));
}

/**
 * Answers a ScoreSaber API GET the way the real API would. The backend reaches ScoreSaber through
 * its proxy, so the real request URL is unwrapped from the proxy path before it is matched.
 *
 * @param path the API path below `/api`, with `:name` placeholders for path parameters
 * @param resolver builds the response, or returns undefined to let the next handler answer
 */
export function scoreSaberApi(path: string, resolver: ScoreSaberApiResolver) {
  return http.get(`${env.PROXY_URL}/*`, ({ request }) => {
    const target = proxiedTarget(request.url);
    if (target.host !== SCORESABER_HOST || !target.pathname.startsWith(SCORESABER_API_PATH)) {
      return undefined;
    }

    const params = matchPath(path, target.pathname.slice(SCORESABER_API_PATH.length));
    if (params === undefined) {
      return undefined;
    }
    return resolver({ params, searchParams: target.searchParams });
  });
}

/** Responds to every ScoreSaber lookup of `path` as if ScoreSaber could not be reached. */
export function scoreSaberApiFailure(path: string, status: number) {
  return scoreSaberApi(path, () => new HttpResponse(null, { status }));
}

const SCORESABER_DIFFICULTY_NUMBERS: Record<ScoreSaberLeaderboard["difficulty"]["difficulty"], number> = {
  Easy: 1,
  Normal: 3,
  Hard: 5,
  Expert: 7,
  ExpertPlus: 9,
};

/** Builds the page entry ScoreSaber lists for a leaderboard. */
export function buildScoreSaberV2LeaderboardPageToken(leaderboard: ScoreSaberLeaderboard) {
  const built: ScoreSaberV2LeaderboardPageToken = {
    id: leaderboard.id,
    map: {
      id: leaderboard.id,
      hash: leaderboard.songHash,
      bsid: null,
      songName: leaderboard.songName,
      songSubName: leaderboard.songSubName,
      songAuthorName: leaderboard.songAuthorName,
      levelAuthorName: leaderboard.levelAuthorName,
      bpm: 120,
      coverUrl: leaderboard.songArt,
      verified: true,
    },
    difficulty: {
      id: leaderboard.id,
      difficulty: SCORESABER_DIFFICULTY_NUMBERS[leaderboard.difficulty.difficulty],
      rawDifficulty: leaderboard.difficulty.difficulty,
      gameMode: `Solo${leaderboard.difficulty.characteristic}`,
    },
    maxScore: leaderboard.maxScore,
    totalScores: leaderboard.plays,
    dailyScores: leaderboard.dailyPlays,
    createdAt: leaderboard.timestamp.toISOString(),
    realm: {
      realmId: 1,
      realmName: "Steam",
      leaderboardStatus: leaderboard.ranked ? "RANKED" : leaderboard.qualified ? "QUALIFIED" : "UNRANKED",
      positiveModifiers: false,
      stars: leaderboard.stars,
      rankedAt: leaderboard.rankedDate?.toISOString() ?? null,
      qualifiedAt: leaderboard.qualifiedDate?.toISOString() ?? null,
      lovedAt: null,
    },
  };
  return built;
}

/**
 * Lists `leaderboards` as ScoreSaber's complete ranked list. With `complete: false`, ScoreSaber
 * reports one more leaderboard than it returns, like a list cut short.
 */
export function scoreSaberRankedLeaderboards(
  leaderboards: ScoreSaberLeaderboard[],
  options: { complete?: boolean } = {}
) {
  return scoreSaberApi("/v2/leaderboards", ({ searchParams }) => {
    if (searchParams.get("status") !== "RANKED") {
      return undefined;
    }

    const data = leaderboards.map(buildScoreSaberV2LeaderboardPageToken);
    return HttpResponse.json({
      data,
      metadata: {
        page: 1,
        itemsPerPage: 100,
        totalItems: options.complete === false ? data.length + 1 : data.length,
        totalPages: 1,
      },
    });
  });
}

/** The seeded score as ScoreSaber returns it, with a rank and weight the local data does not have. */
export function buildScoreSaberV2ScoreResponseToken() {
  const built: ScoreSaberV2ScoreResponseToken = {
    score: {
      id: TEST_SCORE_ID,
      rank: 3,
      unmodifiedScore: 950,
      modifiedScore: 950,
      accuracy: 0.95,
      pp: 250,
      weight: 0.9,
      mods: [],
      badCuts: 1,
      missedNotes: 0,
      maxCombo: 500,
      fullCombo: false,
      hasReplay: false,
      personalBest: true,
      createdAt: "2024-06-01T12:00:00.000Z",
      player: {
        id: TEST_PLAYER_ID,
        name: TEST_PLAYER_NAME,
        country: "US",
        role: null,
        avatar: TEST_AVATAR,
      },
      device: { hmd: "Unknown", controllerLeft: null, controllerRight: null },
    },
    leaderboard: {
      id: TEST_LEADERBOARD_ID,
      map: {
        id: TEST_LEADERBOARD_ID,
        hash: TEST_SONG_HASH,
        bsid: null,
        songName: "Test Song",
        songSubName: "Test Sub",
        songAuthorName: "Test Author",
        levelAuthorName: "Test Mapper",
        bpm: 120,
        coverUrl: "https://example.com/cover.png",
        verified: true,
      },
      difficulty: {
        id: TEST_LEADERBOARD_ID,
        difficulty: 9,
        rawDifficulty: "ExpertPlus",
        gameMode: "SoloStandard",
      },
      maxScore: 1000,
      totalScores: 100,
      dailyScores: 10,
      createdAt: "2024-06-01T12:00:00.000Z",
      realm: {
        realmId: 1,
        realmName: "Steam",
        leaderboardStatus: "RANKED",
        positiveModifiers: false,
        stars: 8.5,
        rankedAt: "2024-06-01T12:00:00.000Z",
        qualifiedAt: null,
        lovedAt: null,
      },
    },
  };
  return built;
}

export const scoreSaberApiHandlers = [
  scoreSaberApi("/v2/scores/:id", ({ params }) =>
    Number(params.id) === TEST_SCORE_ID
      ? HttpResponse.json(buildScoreSaberV2ScoreResponseToken())
      : new HttpResponse(null, { status: 404 })
  ),

  scoreSaberApi("/v2/players/:id", ({ params }) => {
    const token = TEST_PLAYER_TOKENS.find(candidate => candidate.id === params.id);
    return token ? HttpResponse.json(token) : new HttpResponse(null, { status: 404 });
  }),

  scoreSaberApi("/v2/players", ({ searchParams }) => {
    const page = Number(searchParams.get("page") ?? "1");
    const search = searchParams.get("search")?.trim().toLowerCase();
    const country = searchParams.get("countries");
    const includeInactive = searchParams.get("includeInactive") === "true";

    let players = TEST_PLAYER_TOKENS.map(toPageToken);
    if (search) {
      players = players.filter(player => player.name.toLowerCase().includes(search));
    }
    if (country) {
      players = players.filter(player => player.country === country);
    }
    if (!includeInactive) {
      players = players.filter(player => !player.inactive);
    }

    const offset = (page - 1) * PLAYERS_PAGE_SIZE;
    return HttpResponse.json({
      data: players.slice(offset, offset + PLAYERS_PAGE_SIZE),
      metadata: {
        page,
        itemsPerPage: PLAYERS_PAGE_SIZE,
        totalItems: players.length,
        totalPages: Math.max(1, Math.ceil(players.length / PLAYERS_PAGE_SIZE)),
      },
    });
  }),

  scoreSaberApi("/player/:id/scores", ({ searchParams }) =>
    HttpResponse.json({
      playerScores: [],
      metadata: {
        page: Number(searchParams.get("page") ?? "1"),
        itemsPerPage: Number(searchParams.get("limit") ?? "8"),
        total: 0,
      },
    })
  ),

  http.get(`${env.PROXY_URL}/*`, ({ request }) => {
    const target = proxiedTarget(request.url);
    if (target.host !== SCORESABER_HOST) {
      return undefined;
    }
    return new HttpResponse(null, { status: 404 });
  }),
];
