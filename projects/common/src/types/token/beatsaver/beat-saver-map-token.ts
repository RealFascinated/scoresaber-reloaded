import BeatSaverAccountToken from "./beat-saver-account-token";
import BeatSaverMapMetadataToken from "./beat-saver-map-metadata-token";
import BeatSaverMapStatsToken from "./beat-saver-map-stats-token";

export interface BeatSaverMapToken {
  id: string;
  name: string;
  description: string;
  uploader: BeatSaverAccountToken;
  metadata: BeatSaverMapMetadataToken;
  stats: BeatSaverMapStatsToken;
  uploaded: string;
  automapper: boolean;
  ranked: boolean;
  qualified: boolean;
  // todo: versions
  createdAt: string;
  updatedAt: string;
  lastPublishedAt: string;
  tags: string[];
  declaredAi: string;
  blRanked: boolean;
  blQualified: boolean;
}
