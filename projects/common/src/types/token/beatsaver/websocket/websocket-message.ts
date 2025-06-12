export type BeatSaverWebsocketMessageToken = {
  /**
   * Command name
   */
  type: "MAP_UPDATE";

  /**
   * Command data
   */
  msg: any;
};
