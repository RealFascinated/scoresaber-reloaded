import BeatSaverAccount from "./beatsaver-account";
import BeatSaverMapMetadata from "./beatsaver-map-metadata";
import BeatSaverMapStats from "./beatsaver-map-stats";

export interface BeatSaverMap {
  id: string;
  name: string;
  description: string;
  uploader: BeatSaverAccount;
  metadata: BeatSaverMapMetadata;
  stats: BeatSaverMapStats;
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
