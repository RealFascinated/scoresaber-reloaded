export type BeatSaverWebsocketMessageToken = {
  /**
   * Command name
   */
  type: "MAP_UPDATE" | "MAP_CREATE";
  /**
   * Command data
   */
  msg: any;
};
