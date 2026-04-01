import type BeatSaverMapToken from "../map";

export type BeatSaverWebsocketMessageToken = {
  /**
   * Command name
   */
  type: "MAP_UPDATE" | "MAP_CREATE";
  /**
   * Command data (BeatSaver map payload).
   */
  msg: BeatSaverMapToken;
};
