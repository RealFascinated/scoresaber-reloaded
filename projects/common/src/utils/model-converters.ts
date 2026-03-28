import { BeatLeaderScore } from "../model/beatleader-score/beatleader-score";
import { removeObjectFields } from "../object.util";
import { Playlist } from "../playlist/playlist";

const baseFields = ["_id", "__v"];

/**
 * Converts a database BeatLeader score data to BeatLeaderScore.
 *
 * @param beatLeaderScore the BeatLeader score data to convert
 * @returns the converted BeatLeader score data
 */
export function beatLeaderScoreToObject(beatLeaderScore: BeatLeaderScore): BeatLeaderScore {
  return {
    ...removeObjectFields<BeatLeaderScore>(beatLeaderScore, baseFields),
  } as BeatLeaderScore;
}

/**
 * Converts a database playlist to a Playlist.
 *
 * @param playlist the playlist to convert
 * @returns the converted playlist
 */
export function playlistToObject(playlist: Playlist): Playlist {
  return {
    ...removeObjectFields<Playlist>(playlist, baseFields),
  } as Playlist;
}
