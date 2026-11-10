/**
 * The ways scores can be shown. Lives outside of the (client) mode switcher so the server can read it too.
 */
export enum ScoreModeEnum {
  Global = "global",
  Following = "following",
  History = "history",
}
