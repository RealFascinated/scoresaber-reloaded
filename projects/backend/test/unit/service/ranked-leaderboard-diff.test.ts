import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { describe, expect, test } from "bun:test";
import {
  diffRankedLeaderboards,
  findUnrankedLeaderboards,
  hasLeaderboardStatusChanged,
  MAX_UNRANKS_PER_SYNC,
  type ApiLeaderboardState,
  type StoredLeaderboardState,
} from "../../../src/service/leaderboard/ranked-leaderboard-diff";

function stored(overrides: Partial<StoredLeaderboardState> = {}): StoredLeaderboardState {
  return { id: 1, ranked: true, qualified: false, stars: 8, ...overrides };
}

function api(overrides: Partial<ApiLeaderboardState> = {}): ApiLeaderboardState {
  return { id: 1, ranked: true, qualified: false, stars: 8, ...overrides };
}

function storedMap(...rows: StoredLeaderboardState[]): Map<number, StoredLeaderboardState> {
  return new Map(rows.map(row => [row.id, row]));
}

describe("hasLeaderboardStatusChanged", () => {
  test("is true for a leaderboard that is not stored", () => {
    expect(hasLeaderboardStatusChanged(undefined, api())).toBe(true);
  });

  test("is false for an identical leaderboard", () => {
    expect(hasLeaderboardStatusChanged(stored(), api())).toBe(false);
  });

  test("is true when ranked, qualified or stars differ", () => {
    expect(hasLeaderboardStatusChanged(stored(), api({ ranked: false }))).toBe(true);
    expect(hasLeaderboardStatusChanged(stored(), api({ qualified: true }))).toBe(true);
    expect(hasLeaderboardStatusChanged(stored(), api({ stars: 8.5 }))).toBe(true);
  });
});

describe("diffRankedLeaderboards", () => {
  test("finds nothing when nothing changed", () => {
    const diff = diffRankedLeaderboards(storedMap(stored()), [api()]);

    expect(diff.leaderboardsToUpsert).toEqual([]);
    expect(diff.updates).toEqual([]);
    expect(diff.starChanges).toEqual([]);
    expect(diff.reweightedLeaderboardIds).toEqual([]);
    expect(diff.newlyRankedLeaderboardIds).toEqual([]);
  });

  test("records a star change as a reweight", () => {
    const rerated = api({ stars: 9 });
    const diff = diffRankedLeaderboards(storedMap(stored()), [rerated]);

    expect(diff.starChanges).toEqual([{ leaderboardId: 1, previousStars: 8, newStars: 9 }]);
    expect(diff.reweightedLeaderboardIds).toEqual([1]);
    expect(diff.leaderboardsToUpsert).toEqual([rerated]);
    expect(diff.updates).toEqual([
      { previousLeaderboard: { ranked: true, qualified: false, stars: 8 }, newLeaderboard: rerated },
    ]);
    expect(diff.newlyRankedLeaderboardIds).toEqual([]);
  });

  test("treats a leaderboard that was not stored as newly ranked, not as a star change", () => {
    const fresh = api({ id: 2, stars: 5 });
    const diff = diffRankedLeaderboards(storedMap(stored()), [api(), fresh]);

    expect(diff.starChanges).toEqual([]);
    expect(diff.reweightedLeaderboardIds).toEqual([]);
    expect(diff.newlyRankedLeaderboardIds).toEqual([2]);
    expect(diff.leaderboardsToUpsert).toEqual([fresh]);
    expect(diff.updates[0]?.previousLeaderboard).toBeUndefined();
  });

  test("treats a stored but unranked leaderboard that becomes ranked as newly ranked", () => {
    const diff = diffRankedLeaderboards(storedMap(stored({ ranked: false, qualified: true, stars: 6 })), [
      api({ ranked: true, qualified: false, stars: 6 }),
    ]);

    expect(diff.newlyRankedLeaderboardIds).toEqual([1]);
    // The ranked flag changed, so every player's pp on it changed with it, but the stars did not.
    expect(diff.reweightedLeaderboardIds).toEqual([1]);
    expect(diff.starChanges).toEqual([]);
  });

  test("uses 0 as the previous stars when none were stored", () => {
    const diff = diffRankedLeaderboards(storedMap(stored({ stars: null })), [api({ stars: 4 })]);

    expect(diff.starChanges).toEqual([{ leaderboardId: 1, previousStars: 0, newStars: 4 }]);
    expect(diff.updates[0]?.previousLeaderboard?.stars).toBe(0);
  });

  test("handles several leaderboards in one pass", () => {
    const diff = diffRankedLeaderboards(
      storedMap(stored({ id: 1 }), stored({ id: 2, stars: 7 }), stored({ id: 3, stars: 6 })),
      [
        api({ id: 1, stars: 8.5 }),
        api({ id: 2, stars: 7 }),
        api({ id: 3, stars: 5 }),
        api({ id: 4, stars: 9 }),
      ]
    );

    expect(diff.starChanges.map(change => change.leaderboardId)).toEqual([1, 3]);
    expect(diff.leaderboardsToUpsert.map(leaderboard => leaderboard.id)).toEqual([1, 3, 4]);
    expect(diff.newlyRankedLeaderboardIds).toEqual([4]);
  });
});

function rankedLeaderboard(
  id: number,
  overrides: Partial<ScoreSaberLeaderboard> = {}
): ScoreSaberLeaderboard {
  return {
    id,
    ranked: true,
    qualified: false,
    stars: 8,
    songName: `Song ${id}`,
    ...overrides,
  } as ScoreSaberLeaderboard;
}

function rankedMap(...ids: number[]): Map<number, ScoreSaberLeaderboard> {
  return new Map(ids.map(id => [id, rankedLeaderboard(id)]));
}

describe("findUnrankedLeaderboards", () => {
  test("finds nothing when every stored leaderboard is still ranked", () => {
    expect(findUnrankedLeaderboards(rankedMap(1, 2), [{ id: 1 }, { id: 2 }], true)).toEqual({ unranked: [] });
  });

  test("returns the stored leaderboards missing from a complete list in their unranked state", () => {
    const { unranked, refusal } = findUnrankedLeaderboards(rankedMap(1, 2, 3), [{ id: 1 }, { id: 3 }], true);

    expect(refusal).toBeUndefined();
    expect(unranked).toHaveLength(1);
    expect(unranked[0]).toMatchObject({
      id: 2,
      ranked: false,
      qualified: false,
      stars: 0,
      songName: "Song 2",
    });
  });

  test("does not change the stored leaderboard it was derived from", () => {
    const stored = rankedMap(1, 2);
    findUnrankedLeaderboards(stored, [{ id: 1 }], true);

    expect(stored.get(2)?.ranked).toBe(true);
    expect(stored.get(2)?.stars).toBe(8);
  });

  test("ignores leaderboards that are already stored as unranked", () => {
    const stored = new Map([[1, rankedLeaderboard(1, { ranked: false, qualified: true })]]);

    expect(findUnrankedLeaderboards(stored, [{ id: 2 }], true)).toEqual({ unranked: [] });
  });

  test("refuses to unrank anything from an incomplete list", () => {
    const { unranked, refusal } = findUnrankedLeaderboards(rankedMap(1, 2), [{ id: 1 }], false);

    expect(unranked).toEqual([]);
    expect(refusal).toContain("incomplete");
  });

  test("refuses to unrank anything from an empty list", () => {
    const { unranked, refusal } = findUnrankedLeaderboards(rankedMap(1, 2), [], true);

    expect(unranked).toEqual([]);
    expect(refusal).toContain("no ranked leaderboards");
  });

  test("refuses to unrank more than the per-sync limit at once", () => {
    const ids = Array.from({ length: MAX_UNRANKS_PER_SYNC + 2 }, (_, index) => index + 1);
    const { unranked, refusal } = findUnrankedLeaderboards(rankedMap(...ids), [{ id: 99_999 }], true);

    expect(unranked).toEqual([]);
    expect(refusal).toContain(String(ids.length));
  });

  test("allows exactly the per-sync limit", () => {
    const ids = Array.from({ length: MAX_UNRANKS_PER_SYNC }, (_, index) => index + 1);

    expect(findUnrankedLeaderboards(rankedMap(...ids), [{ id: 99_999 }], true).unranked).toHaveLength(
      MAX_UNRANKS_PER_SYNC
    );
  });

  test("an unranked leaderboard is picked up by the diff as a star change to 0", () => {
    const stored = rankedMap(1, 2);
    const { unranked } = findUnrankedLeaderboards(stored, [rankedLeaderboard(1)], true);
    const diff = diffRankedLeaderboards(stored, [rankedLeaderboard(1), ...unranked]);

    expect(diff.starChanges).toEqual([{ leaderboardId: 2, previousStars: 8, newStars: 0 }]);
    expect(diff.reweightedLeaderboardIds).toEqual([2]);
    expect(diff.updates[0]?.previousLeaderboard?.ranked).toBe(true);
    expect(diff.updates[0]?.newLeaderboard.ranked).toBe(false);
  });
});
