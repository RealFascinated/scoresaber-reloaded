import { env } from "@ssr/common/env";
import type {
  RankedBatch,
  RankedBatchLeaderboardChange,
  RankedBatchLeaderboardInfo,
  RankedBatchNewLeaderboard,
} from "@ssr/common/schemas/ranked-batch/ranked-batch";
import type { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import { formatDate } from "@ssr/common/utils/time-utils";

/**
 * Builds the playlist of the maps a ranked batch re-rated or ranked that are still ranked.
 *
 * @param rankedBatch the ranked batch
 * @param leaderboards the leaderboards the ranked batch re-rated
 * @param newLeaderboards the leaderboards that became ranked in the ranked batch
 * @returns the ranked batch playlist, synced from the ranked batch playlist endpoint
 */
export function buildRankedBatchPlaylist(
  rankedBatch: Pick<RankedBatch, "id" | "name" | "startedAt">,
  leaderboards: RankedBatchLeaderboardChange[],
  newLeaderboards: RankedBatchNewLeaderboard[] = []
): Playlist {
  const rankedLeaderboards: RankedBatchLeaderboardInfo[] = [
    ...leaderboards.filter(leaderboard => leaderboard.newStars !== 0),
    ...newLeaderboards,
  ];
  const songs = new Map<string, Playlist["songs"][number]>();
  for (const leaderboard of rankedLeaderboards) {
    let song = songs.get(leaderboard.songHash);
    if (!song) {
      song = {
        songName: leaderboard.songName,
        levelAuthorName: leaderboard.songAuthorName,
        hash: leaderboard.songHash,
        difficulties: [],
      };
      songs.set(leaderboard.songHash, song);
    }
    song.difficulties.push({
      difficulty: leaderboard.difficulty,
      characteristic: leaderboard.characteristic,
    });
  }

  return {
    playlistTitle: `${rankedBatch.name} (${formatDate(rankedBatch.startedAt, "MMM D, YYYY")})`,
    playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
    customData: {
      syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/ranked-batch/${rankedBatch.id}.bplist`,
    },
    songs: Array.from(songs.values()),
  };
}
