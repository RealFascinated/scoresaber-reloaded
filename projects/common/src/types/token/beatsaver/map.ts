import type BeatSaverAccountToken from "./account";
import type BeatSaverMapMetadataToken from "./map-metadata";
import type BeatSaverMapStatsToken from "./map-stats";
import type BeatSaverMapVersionToken from "./map-version";

/** BeatSaver API `MapDetail.declaredAi` (Swagger). */
export type BeatSaverMapDeclaredAi = "Admin" | "Uploader" | "SageScore" | "None";

/** Shapes `MapDetail` from BeatSaver Swagger where we already consume maps in-app. */
export default interface BeatSaverMapToken {
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
  versions: BeatSaverMapVersionToken[];
  createdAt: string;
  updatedAt: string;
  lastPublishedAt: string;
  tags: string[];
  declaredAi: BeatSaverMapDeclaredAi;
  blRanked: boolean;
  blQualified: boolean;

  bookmarked?: boolean;
  collaborators?: BeatSaverAccountToken[];
  curator?: BeatSaverAccountToken;
  curatedAt?: string;
  deletedAt?: string;
  nsfw?: boolean;
}
