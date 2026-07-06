import ScoreSaberV2MetadataToken from "../metadata";
import { ScoreSaberV2PlayerStatsToken } from "./player-stats";

export type ScoreSaberV2PlayerPageToken = {
  id: string;
  name: string;
  playerNameInGame: string;
  country: string;
  role: string | null;
  avatar: string;
  avatarVersion: number;
  permissions: number;
  banned: boolean;
  silenced: boolean;
  inactive: boolean;
  stats: ScoreSaberV2PlayerStatsToken;
};

export default interface ScoreSaberV2PlayersPageToken {
  data: ScoreSaberV2PlayerPageToken[];
  metadata: ScoreSaberV2MetadataToken;
}
