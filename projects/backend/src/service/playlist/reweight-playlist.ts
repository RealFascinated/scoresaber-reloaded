import { env } from "@ssr/common/env";
import type { Reweight, ReweightLeaderboardChange } from "@ssr/common/schemas/reweight/reweight";
import type { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import { formatDate } from "@ssr/common/utils/time-utils";

/**
 * Builds the playlist of the maps a reweight re-rated that are still ranked.
 *
 * @param reweight the reweight
 * @param leaderboards the leaderboards the reweight re-rated
 * @returns the reweight playlist, synced from the reweight playlist endpoint
 */
export function buildReweightPlaylist(
  reweight: Pick<Reweight, "id" | "name" | "startedAt">,
  leaderboards: ReweightLeaderboardChange[]
): Playlist {
  const songs = new Map<string, Playlist["songs"][number]>();
  for (const leaderboard of leaderboards) {
    if (leaderboard.newStars === 0) {
      continue;
    }
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
    playlistTitle: `${reweight.name} (${formatDate(reweight.startedAt, "MMM D, YYYY")})`,
    playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
    customData: {
      syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/reweight/${reweight.id}.bplist`,
    },
    songs: Array.from(songs.values()),
  };
}
