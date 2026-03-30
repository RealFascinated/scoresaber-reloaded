import BeatSaverMapToken from "../map";

/** BeatSaver `SearchResponse.info` subset (Swagger). */
export type BeatSaverLatestMapsSearchInfo = {
  duration?: number;
  pages?: number;
  total?: number;
};

/** BeatSaver `SearchResponse` for `/maps/latest` (Swagger). */
export type BeatSaverLatestMapsToken = {
  /**
   * The maps.
   */
  docs: BeatSaverMapToken[];

  info?: BeatSaverLatestMapsSearchInfo;
  redirect?: string;
};
