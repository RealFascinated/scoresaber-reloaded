import ScoreSaberLeaderboard from "./model/leaderboard/impl/scoresaber-leaderboard";
import ScoreSaberLeaderboardToken from "./types/token/scoresaber/leaderboard";
import LeaderboardDifficulty from "./model/leaderboard/leaderboard-difficulty";
import { MapCharacteristic } from "./types/map-characteristic";
import { LeaderboardStatus } from "./model/leaderboard/leaderboard-status";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate, parseDate } from "./utils/time-utils";
import ScoreSaberPlayerToken from "./types/token/scoresaber/player";
import ScoreSaberPlayer, { PeakRank, ScoreSaberBadge, ScoreSaberBio } from "./player/impl/scoresaber-player";
import { PlayerHistory } from "./player/player-history";
import ky from "ky";
import { Config } from "./config";
import { getValueFromHistory } from "./utils/player-utils";
import { getPageFromRank } from "./utils/utils";
import ScoreSaberScoreToken from "./types/token/scoresaber/score";
import { ScoreSaberScore } from "./model/score/impl/scoresaber-score";
import { Modifier } from "./score/modifier";
import { getDifficultyFromScoreSaberDifficulty } from "./utils/scoresaber.util";
import sanitize from "sanitize-html";

/**
 * Parses a {@link ScoreSaberLeaderboardToken} into a {@link ScoreSaberLeaderboard}.
 *
 * @param token the token to parse
 */
export function getScoreSaberLeaderboardFromToken(token: ScoreSaberLeaderboardToken): ScoreSaberLeaderboard {
  const difficulty: LeaderboardDifficulty = {
    leaderboardId: token.difficulty.leaderboardId,
    difficulty: getDifficultyFromScoreSaberDifficulty(token.difficulty.difficulty),
    characteristic: token.difficulty.gameMode.replace("Solo", "") as MapCharacteristic,
    difficultyRaw: token.difficulty.difficultyRaw,
  };

  let status: LeaderboardStatus = "Unranked";
  if (token.qualified) {
    status = "Qualified";
  } else if (token.ranked) {
    status = "Ranked";
  }

  return {
    id: token.id,
    songHash: token.songHash.toUpperCase(),
    songName: token.songName,
    songSubName: token.songSubName,
    songAuthorName: token.songAuthorName,
    levelAuthorName: token.levelAuthorName,
    difficulty: difficulty,
    difficulties:
      token.difficulties != undefined && token.difficulties.length > 0
        ? token.difficulties.map(difficulty => {
            return {
              leaderboardId: difficulty.leaderboardId,
              difficulty: getDifficultyFromScoreSaberDifficulty(difficulty.difficulty),
              characteristic: difficulty.gameMode.replace("Solo", "") as MapCharacteristic,
              difficultyRaw: difficulty.difficultyRaw,
            };
          })
        : [difficulty],
    maxScore: token.maxScore,
    ranked: token.ranked,
    songArt: token.coverImage,
    timestamp: parseDate(token.createdDate),
    stars: token.stars,
    plays: token.plays,
    dailyPlays: token.dailyPlays,
    qualified: token.qualified,
    status: status,
  };
}

/**
 * Gets a {@link ScoreSaberScore} from a {@link ScoreSaberScoreToken}.
 *
 * @param token the token to convert
 * @param playerId the id of the player who set the score
 * @param leaderboard the leaderboard the score was set on
 */
export function getScoreSaberScoreFromToken(
  token: ScoreSaberScoreToken,
  leaderboard: ScoreSaberLeaderboard,
  playerId?: string
): ScoreSaberScore {
  const modifiers: Modifier[] =
    token.modifiers == undefined || token.modifiers === ""
      ? []
      : token.modifiers.split(",").map(mod => {
          mod = mod.toUpperCase();
          const modifier = Modifier[mod as keyof typeof Modifier];
          if (modifier === undefined) {
            throw new Error(`Unknown modifier: ${mod}`);
          }
          return modifier;
        });

  return {
    playerId: playerId || token.leaderboardPlayerInfo.id,
    leaderboardId: leaderboard.id,
    difficulty: leaderboard.difficulty.difficulty,
    characteristic: leaderboard.difficulty.characteristic,
    score: token.baseScore,
    accuracy: leaderboard.maxScore ? (token.baseScore / leaderboard.maxScore) * 100 : Infinity,
    rank: token.rank,
    modifiers: modifiers,
    misses: token.missedNotes + token.badCuts,
    missedNotes: token.missedNotes,
    badCuts: token.badCuts,
    fullCombo: token.fullCombo,
    timestamp: new Date(token.timeSet),
    scoreId: token.id,
    pp: token.pp,
    weight: token.weight,
    maxCombo: token.maxCombo,
    playerInfo: token.leaderboardPlayerInfo,
  };
}

/**
 * Gets the ScoreSaber Player from an {@link ScoreSaberPlayerToken}.
 *
 * @param token the player token
 * @param playerIdCookie the id of the claimed player
 */
export async function getScoreSaberPlayerFromToken(
  token: ScoreSaberPlayerToken,
  playerIdCookie?: string
): Promise<ScoreSaberPlayer> {
  const bio: ScoreSaberBio = {
    lines: token.bio ? sanitize(token.bio).split("\n") : [],
    linesStripped: token.bio ? sanitize(token.bio.replace(/<[^>]+>/g, "")).split("\n") : [], // strips html tags
  };
  const badges: ScoreSaberBadge[] =
    token.badges?.map(badge => {
      return {
        url: badge.image,
        description: badge.description,
      };
    }) || [];

  let isBeingTracked = false;
  let peakRank: PeakRank | undefined;
  const todayDate = formatDateMinimal(getMidnightAlignedDate(new Date()));
  let statisticHistory: { [key: string]: PlayerHistory } = {};

  try {
    const { statistics: history } = await ky
      .get<{
        statistics: { [key: string]: PlayerHistory };
      }>(
        `${Config.apiUrl}/player/history/${token.id}/50/${playerIdCookie && playerIdCookie == token.id ? "?createIfMissing=true" : ""}`
      )
      .json();
    if (history) {
      // Use the latest data for today
      history[todayDate] = {
        ...history[todayDate],
        rank: token.rank,
        countryRank: token.countryRank,
        pp: token.pp,
        replaysWatched: token.scoreStats.replaysWatched,
        accuracy: {
          ...history[todayDate]?.accuracy,
          averageRankedAccuracy: token.scoreStats.averageRankedAccuracy,
        },
        scores: {
          ...history[todayDate]?.scores,
          totalScores: token.scoreStats.totalPlayCount,
          totalRankedScores: token.scoreStats.rankedPlayCount,
        },
        score: {
          ...history[todayDate]?.score,
          totalScore: token.scoreStats.totalScore,
          totalRankedScore: token.scoreStats.totalRankedScore,
        },
      };

      for (const [date, stat] of Object.entries(history)) {
        const parsedDate = parseDate(date);
        if (
          stat.rank !== undefined &&
          (peakRank === undefined ||
            stat.rank < peakRank.rank ||
            (stat.rank === peakRank.rank && parsedDate < peakRank.date))
        ) {
          peakRank = {
            rank: stat.rank,
            date: parsedDate,
          };
        }
      }

      isBeingTracked = true;
    }
    statisticHistory = history;
  } catch (e) {}

  const playerRankHistory = token.histories.split(",").map(value => {
    return parseInt(value);
  });
  playerRankHistory.push(token.rank);

  let missingDays = 0;
  let daysAgo = 0; // Start from current day
  for (let i = playerRankHistory.length - 1; i >= 0; i--) {
    const rank = playerRankHistory[i];
    if (rank == 999_999) {
      continue;
    }

    const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
    daysAgo += 1;

    const dateKey = formatDateMinimal(date);
    if (!statisticHistory[dateKey] || statisticHistory[dateKey].rank == undefined) {
      missingDays += 1;
      statisticHistory[dateKey] = {
        ...statisticHistory[dateKey],
        rank: rank,
      };
    }
  }

  if (missingDays > 0 && missingDays != playerRankHistory.length) {
    console.log(
      `Player has ${missingDays} missing day${missingDays > 1 ? "s" : ""}, filling in with fallback history...`
    );
  }

  // Sort the fallback history
  statisticHistory = Object.entries(statisticHistory)
    .sort((a, b) => Date.parse(b[0]) - Date.parse(a[0]))
    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

  /**
   * Gets the change in the given stat
   *
   * @param statType the stat to check
   * @param isNegativeChange whether to multiply the change by 1 or -1
   * @param daysAgo the amount of days ago to get the stat for
   * @return the change
   */
  const getStatisticChange = (statType: string, isNegativeChange: boolean, daysAgo: number = 1): number | undefined => {
    const todayStats = statisticHistory[todayDate];
    let otherDate: Date | undefined;

    if (daysAgo === 1) {
      otherDate = getMidnightAlignedDate(getDaysAgoDate(1)); // Yesterday
    } else {
      const targetDate = getDaysAgoDate(daysAgo);

      // Filter available dates to find the closest one to the target
      const availableDates = Object.keys(statisticHistory)
        .map(dateKey => new Date(dateKey))
        .filter(date => {
          // Convert date back to the correct format for statisticHistory lookup
          const formattedDate = formatDateMinimal(date);
          const statsForDate = statisticHistory[formattedDate];
          const hasStat = statsForDate && statType in statsForDate;

          // Only consider past dates with the required statType
          const isPast = date.getTime() < new Date().getTime();
          return hasStat && isPast;
        });

      // If no valid dates are found, return undefined
      if (availableDates.length === 0) {
        return undefined;
      }

      // Find the closest date from the filtered available dates
      otherDate = availableDates.reduce((closestDate, currentDate) => {
        const currentDiff = Math.abs(currentDate.getTime() - targetDate.getTime());
        const closestDiff = Math.abs(closestDate.getTime() - targetDate.getTime());
        return currentDiff < closestDiff ? currentDate : closestDate;
      }, availableDates[0]); // Start with the first available date
    }

    // Ensure todayStats exists and contains the statType
    if (!todayStats || !getValueFromHistory(todayStats, statType)) {
      return undefined;
    }

    const otherStats = statisticHistory[formatDateMinimal(otherDate)]; // This is now validated

    // Ensure otherStats exists and contains the statType
    if (!otherStats || !getValueFromHistory(otherStats, statType)) {
      return undefined;
    }

    const statToday = getValueFromHistory(todayStats, statType);
    const statOther = getValueFromHistory(otherStats, statType);

    if (statToday === undefined || statOther === undefined) {
      return undefined;
    }
    return (statToday - statOther) * (!isNegativeChange ? 1 : -1);
  };

  const getStatisticChanges = (daysAgo: number): PlayerHistory => {
    return {
      rank: getStatisticChange("rank", true, daysAgo),
      countryRank: getStatisticChange("countryRank", true, daysAgo),
      pp: getStatisticChange("pp", false, daysAgo),
      replaysWatched: getStatisticChange("replaysWatched", false, daysAgo),
      accuracy: {
        averageRankedAccuracy: getStatisticChange("accuracy.averageRankedAccuracy", false, daysAgo),
      },
      score: {
        totalScore: getStatisticChange("score.totalScore", false, daysAgo),
        totalRankedScore: getStatisticChange("score.totalRankedScore", false, daysAgo),
      },
      scores: {
        totalScores: getStatisticChange("scores.totalScores", false, daysAgo),
        totalRankedScores: getStatisticChange("scores.totalRankedScores", false, daysAgo),
        rankedScores: getStatisticChange("scores.rankedScores", false, daysAgo),
        unrankedScores: getStatisticChange("scores.unrankedScores", false, daysAgo),
      },
    };
  };

  return {
    id: token.id,
    name: token.name,
    avatar: token.profilePicture,
    country: token.country,
    rank: token.rank,
    countryRank: token.countryRank,
    joinedDate: new Date(token.firstSeen),
    bio: bio,
    pp: token.pp,
    statisticChange: {
      daily: getStatisticChanges(1),
      weekly: getStatisticChanges(7),
      monthly: getStatisticChanges(30),
    },
    role: token.role == null ? undefined : token.role,
    badges: badges,
    statisticHistory: statisticHistory,
    statistics: token.scoreStats,
    rankPages: {
      global: getPageFromRank(token.rank, 50),
      country: getPageFromRank(token.countryRank, 50),
    },
    peakRank: peakRank,
    permissions: token.permissions,
    banned: token.banned,
    inactive: token.inactive,
    isBeingTracked: isBeingTracked,
  };
}
