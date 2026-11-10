import { Type } from "typebox";

export enum WebsiteLanding {
  PLAYER_HOME = "playerHome",
  LANDING = "landing",
  PLAYER_PAGE = "playerPage",
}
export const WebsiteLandingSchema = Type.Enum(WebsiteLanding);
