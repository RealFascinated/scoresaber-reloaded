import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";

/** The part of a leaderboard the ranked sync compares against ScoreSaber. */
export type StoredLeaderboardState = Pick<ScoreSaberLeaderboard, "id" | "ranked" | "qualified"> & {
  stars: number | null;
};

/** The part of a leaderboard ScoreSaber reports that the ranked sync compares. */
export type ApiLeaderboardState = Pick<
  ScoreSaberLeaderboard,
  "id" | "ranked" | "qualified" | "stars" | "rankedDate"
>;

/**
 * A ranked leaderboard older than this is not a newly ranked one, e.g. a map that was ranked long
 * ago and only turned up again because it was unranked in between.
 */
export const NEWLY_RANKED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type LeaderboardUpdate<TLeaderboard extends ApiLeaderboardState = ScoreSaberLeaderboard> = {
  previousLeaderboard?: Pick<ScoreSaberLeaderboard, "ranked" | "qualified" | "stars">;
  newLeaderboard: TLeaderboard;
};

export type StarChange = {
  leaderboardId: number;
  previousStars: number;
  newStars: number;
};

export type NewlyRankedLeaderboard = {
  leaderboardId: number;
  stars: number;
};

export type RankedLeaderboardDiff<TLeaderboard extends ApiLeaderboardState = ScoreSaberLeaderboard> = {
  /** Leaderboards that are new or whose ranked/qualified/stars status changed. */
  leaderboardsToUpsert: TLeaderboard[];
  /** Leaderboards whose ranked/qualified/stars status changed, for notifications. */
  updates: LeaderboardUpdate<TLeaderboard>[];
  /** Ranked leaderboards that were re-rated. */
  starChanges: StarChange[];
  /** Leaderboards whose weight changed, so every player's pp on them changed with it. */
  reweightedLeaderboardIds: number[];
  /** Ranked leaderboards that were not stored yet, or were stored as unranked. */
  newlyRankedLeaderboardIds: number[];
  /**
   * The newly ranked leaderboards with the stars they were ranked at, for the ranked batch. Only
   * leaderboards that were ranked recently, and never when nothing was stored as ranked yet (the
   * first sync would otherwise list every ranked map).
   */
  newlyRanked: NewlyRankedLeaderboard[];
};

/**
 * Whether ScoreSaber's ranked/qualified/stars status differs from what is stored.
 *
 * @param stored the stored state, undefined if the leaderboard is not stored
 * @param api the leaderboard as ScoreSaber reports it
 */
export function hasLeaderboardStatusChanged(
  stored: StoredLeaderboardState | undefined,
  api: ApiLeaderboardState
) {
  return (
    !stored ||
    stored.ranked !== api.ranked ||
    stored.qualified !== api.qualified ||
    stored.stars !== api.stars
  );
}

/**
 * Compares the stored ranked leaderboards with ScoreSaber's.
 *
 * @param stored the stored ranked leaderboards by id
 * @param apiLeaderboards the ranked leaderboards ScoreSaber reports
 * @param now the current time, to tell whether a leaderboard was ranked recently
 */
export function diffRankedLeaderboards<TLeaderboard extends ApiLeaderboardState>(
  stored: ReadonlyMap<number, StoredLeaderboardState>,
  apiLeaderboards: TLeaderboard[],
  now: Date = new Date()
) {
  const diff: RankedLeaderboardDiff<TLeaderboard> = {
    leaderboardsToUpsert: [],
    updates: [],
    starChanges: [],
    reweightedLeaderboardIds: [],
    newlyRankedLeaderboardIds: [],
    newlyRanked: [],
  };

  for (const api of apiLeaderboards) {
    const previous = stored.get(api.id);

    if (previous && (previous.stars !== api.stars || previous.ranked !== api.ranked)) {
      diff.reweightedLeaderboardIds.push(api.id);
    }
    if (!previous?.ranked && api.ranked) {
      diff.newlyRankedLeaderboardIds.push(api.id);
      const rankedRecently =
        !api.rankedDate || now.getTime() - new Date(api.rankedDate).getTime() <= NEWLY_RANKED_MAX_AGE_MS;
      if (stored.size > 0 && rankedRecently) {
        diff.newlyRanked.push({ leaderboardId: api.id, stars: api.stars });
      }
    }

    if (!hasLeaderboardStatusChanged(previous, api)) {
      continue;
    }

    diff.leaderboardsToUpsert.push(api);
    diff.updates.push({
      previousLeaderboard: previous
        ? { ranked: previous.ranked, qualified: previous.qualified, stars: previous.stars ?? 0 }
        : undefined,
      newLeaderboard: api,
    });

    if (previous && previous.stars !== api.stars) {
      diff.starChanges.push({
        leaderboardId: api.id,
        previousStars: previous.stars ?? 0,
        newStars: api.stars,
      });
    }
  }

  return diff;
}

/**
 * More unranked leaderboards than this in one sync is far more likely to be a bad response from
 * ScoreSaber than real unranks, so none are applied.
 */
export const MAX_UNRANKS_PER_SYNC = 50;

export type UnrankDetection<TLeaderboard> = {
  /** The stored leaderboards that ScoreSaber no longer ranks, in their unranked state. */
  unranked: TLeaderboard[];
  /** Why missing leaderboards were not treated as unranked, if they were not. */
  refusal?: string;
};

/**
 * Finds the stored ranked leaderboards that ScoreSaber's ranked list no longer contains, which
 * means they were unranked. The list is only trusted when it was fetched completely and the number
 * of missing leaderboards is plausible, because a partial list would otherwise unrank real maps.
 *
 * @param stored the stored ranked leaderboards by id
 * @param apiLeaderboards the ranked leaderboards ScoreSaber reports
 * @param complete whether ScoreSaber's list was fetched completely
 */
export function findUnrankedLeaderboards<TLeaderboard extends ScoreSaberLeaderboard>(
  stored: ReadonlyMap<number, TLeaderboard>,
  apiLeaderboards: Pick<ScoreSaberLeaderboard, "id">[],
  complete: boolean
) {
  const apiIds = new Set(apiLeaderboards.map(leaderboard => leaderboard.id));
  const missing = [...stored.values()].filter(
    leaderboard => leaderboard.ranked && !apiIds.has(leaderboard.id)
  );

  if (missing.length === 0) {
    return { unranked: [] };
  }
  if (!complete) {
    return {
      unranked: [],
      refusal: `ScoreSaber's ranked list is incomplete, so ${missing.length} leaderboards missing from it were not unranked.`,
    };
  }
  if (apiLeaderboards.length === 0) {
    return {
      unranked: [],
      refusal: `ScoreSaber returned no ranked leaderboards, so ${missing.length} stored ones were not unranked.`,
    };
  }
  if (missing.length > MAX_UNRANKS_PER_SYNC) {
    return {
      unranked: [],
      refusal: `${missing.length} leaderboards are missing from ScoreSaber's ranked list (limit ${MAX_UNRANKS_PER_SYNC}), so none were unranked.`,
    };
  }

  return {
    unranked: missing.map(leaderboard => ({ ...leaderboard, ranked: false, qualified: false, stars: 0 })),
  };
}
