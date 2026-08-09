import type { ScoreSaberV2PlayerToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import type { ScoreSaberV2PlayerPageToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/players-page";
import { parse } from "devalue";
import { cachedPlayerTokenCacheKey } from "../../src/common/cache-keys";
import { redisClient } from "../../src/common/redis";
import { ScoreSaberApiService } from "../../src/service/external/scoresaber-api.service";
import {
  INSERT_ACCOUNT_ID,
  TEST_INACTIVE_PLAYER_ID,
  TEST_PLAYER_TWO_ID,
  TEST_PLAYER_TWO_NAME,
} from "./constants";
import { buildScoreSaberV2PlayerToken } from "./fixtures";

let scoreSaberApiPatched = false;

const TEST_PLAYER_TOKENS: ScoreSaberV2PlayerToken[] = [
  buildScoreSaberV2PlayerToken(),
  buildScoreSaberV2PlayerToken({
    id: TEST_PLAYER_TWO_ID,
    name: TEST_PLAYER_TWO_NAME,
    playerNameInGame: TEST_PLAYER_TWO_NAME,
    stats: {
      realmId: 1,
      realmName: "Steam",
      rank: 200,
      countryRank: 20,
      rankChange: null,
      totalPP: 80,
      plusOnePP: 1,
      totalScore: "800",
      totalRankedScore: "800",
      totalPlayedLeaderboards: 1,
      totalPlayedRankedLeaderboards: 1,
      totalSubmittedPlays: 1,
      totalReplayViews: 0,
      averageAccuracy: 0.9,
      weightedAverageAccuracy: 0.9,
      completionAccuracy: 0.9,
      device: null,
    },
  }),
  buildScoreSaberV2PlayerToken({
    id: TEST_INACTIVE_PLAYER_ID,
    name: "InactivePlayer",
    playerNameInGame: "InactivePlayer",
    inactive: true,
    stats: {
      realmId: 1,
      realmName: "Steam",
      rank: 500,
      countryRank: 50,
      rankChange: null,
      totalPP: 50,
      plusOnePP: 1,
      totalScore: "500",
      totalRankedScore: "500",
      totalPlayedLeaderboards: 1,
      totalPlayedRankedLeaderboards: 1,
      totalSubmittedPlays: 1,
      totalReplayViews: 0,
      averageAccuracy: 0.85,
      weightedAverageAccuracy: 0.85,
      completionAccuracy: 0.85,
      device: null,
    },
  }),
  buildScoreSaberV2PlayerToken({
    id: INSERT_ACCOUNT_ID,
    name: "InsertAccount",
    playerNameInGame: "InsertAccount",
    stats: {
      realmId: 1,
      realmName: "Steam",
      rank: 300,
      countryRank: 30,
      rankChange: null,
      totalPP: 60,
      plusOnePP: 1,
      totalScore: "600",
      totalRankedScore: "600",
      totalPlayedLeaderboards: 1,
      totalPlayedRankedLeaderboards: 1,
      totalSubmittedPlays: 1,
      totalReplayViews: 0,
      averageAccuracy: 0.88,
      weightedAverageAccuracy: 0.88,
      completionAccuracy: 0.88,
      device: null,
    },
  }),
];

function toPageToken(token: ScoreSaberV2PlayerToken): ScoreSaberV2PlayerPageToken {
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

async function lookupCachedPlayer(playerId: string): Promise<ScoreSaberV2PlayerToken | undefined> {
  const cached = await redisClient.get(cachedPlayerTokenCacheKey(playerId));
  if (!cached) {
    return TEST_PLAYER_TOKENS.find(token => token.id === playerId);
  }

  try {
    return parse(cached) as ScoreSaberV2PlayerToken;
  } catch {
    return TEST_PLAYER_TOKENS.find(token => token.id === playerId);
  }
}

/** Stubs ScoreSaber HTTP lookups so integration tests stay offline and deterministic. */
export function patchScoreSaberApiForTests(): void {
  if (scoreSaberApiPatched) {
    return;
  }

  ScoreSaberApiService.lookupPlayer = async playerId => {
    return lookupCachedPlayer(playerId);
  };

  ScoreSaberApiService.lookupPlayers = async (page, options) => {
    const itemsPerPage = 50;
    const search = options?.search?.trim().toLowerCase();
    let players = TEST_PLAYER_TOKENS.map(toPageToken);

    if (search) {
      players = players.filter(player => player.name.toLowerCase().includes(search));
    }

    if (options?.country) {
      players = players.filter(player => player.country === options.country);
    }

    if (!options?.includeInactives) {
      players = players.filter(player => !player.inactive);
    }

    const totalItems = players.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const offset = (page - 1) * itemsPerPage;

    return {
      data: players.slice(offset, offset + itemsPerPage),
      metadata: {
        page,
        itemsPerPage,
        totalItems,
        totalPages,
      },
    };
  };

  ScoreSaberApiService.lookupPlayerScores = async ({ page }) => ({
    playerScores: [],
    metadata: {
      page,
      itemsPerPage: 8,
      total: 0,
    },
  });

  scoreSaberApiPatched = true;
}
