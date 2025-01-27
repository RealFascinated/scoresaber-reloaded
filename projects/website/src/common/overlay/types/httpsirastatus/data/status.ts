import { HttpSiraStatus_BeatMapData } from "./beatmap";
import { HttpSiraStatus_GameData } from "@/common/overlay/types/httpsirastatus/data/game";
import { HttpSiraStatus_Performance } from "@/common/overlay/types/httpsirastatus/data/performance";

export type HttpSiraStatus_Status = {
  /**
   * The beatmap data.
   */
  beatmap: HttpSiraStatus_BeatMapData;

  /**
   * The game data.
   */
  game: HttpSiraStatus_GameData;

  // todo: complete this
  // mod: string;

  /**
   * The current score data.
   */
  performance: HttpSiraStatus_Performance;

  // todo: complete this
  // playerSettings: string;
};
