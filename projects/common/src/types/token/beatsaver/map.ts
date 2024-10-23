import BeatSaverAccountToken from "./account";
import BeatSaverMapMetadataToken from "./map-metadata";
import BeatSaverMapStatsToken from "./map-stats";
import { BeatSaverMapVersionToken } from "./map-version";

export interface BeatSaverMapToken {
  /**
   * The id of the map.
   */
  id: string;

  /**
   * The name of the map.
   */
  name: string;

  /**
   * The description of the map.
   */
  description: string;

  /**
   * The uploader of the map.
   */
  uploader: BeatSaverAccountToken;

  /**
   * The metadata of the map.
   */
  metadata: BeatSaverMapMetadataToken;

  /**
   * The stats of the map.
   */
  stats: BeatSaverMapStatsToken;

  /**
   * The date the map was uploaded.
   */
  uploaded: string;

  /**
   * Whether the map was mapped by an automapper.
   */
  automapper: boolean;

  /**
   * Whether the map is ranked on ScoreSaber.
   */
  ranked: boolean;

  /**
   * Whether the map is qualified on ScoreSaber.
   */
  qualified: boolean;

  /**
   * The versions of the map.
   */
  versions: BeatSaverMapVersionToken[];

  /**
   * The date the map was created.
   */
  createdAt: string;

  /**
   * The date the map was last updated.
   */
  updatedAt: string;

  /**
   * The date the map was last published.
   */
  lastPublishedAt: string;

  /**
   * The tags of the map.
   */
  tags: string[];

  /**
   * Whether the map is declared to be mapped by an AI.
   */
  declaredAi: string;

  /**
   * Whether the map is ranked on BeatLeader.
   */
  blRanked: boolean;

  /**
   * Whether the map is qualified on BeatLeader.
   */
  blQualified: boolean;
}
