"use client";

import type { OverlayData } from "@/common/overlay/overlay-data";
import type { OverlayPlayer } from "@/common/overlay/overlay-player";
import type { BeatLeaderOverlayDataResponse } from "@ssr/common/schemas/response/beatleader/overlay-data";
import type {
  BeatLeaderOverlayPlayerResponse,
  BeatLeaderOverlayRatingsResponse,
} from "@ssr/common/schemas/response/beatleader/overlay-ratings";
import { createContext, useContext } from "react";

/** Everything the widgets of an overlay can show. */
export type OverlayRuntime = {
  data: OverlayData;
  player: OverlayPlayer | undefined;
  /** The accuracy of the player's best score on the current map, for each second. */
  pb: BeatLeaderOverlayDataResponse | undefined;
  /** The player's BeatLeader pp, undefined while loading or when the player is not on BeatLeader. */
  blPlayer: BeatLeaderOverlayPlayerResponse | undefined;
  /** The BeatLeader ratings of the current difficulty, which live BeatLeader pp is calculated from. */
  ratings: BeatLeaderOverlayRatingsResponse | undefined;
  /** True in the editor, where widgets without data show a placeholder instead of nothing. */
  editing: boolean;
};

const EMPTY_RUNTIME: OverlayRuntime = {
  data: {},
  player: undefined,
  pb: undefined,
  blPlayer: undefined,
  ratings: undefined,
  editing: false,
};

export const OverlayRuntimeContext = createContext<OverlayRuntime>(EMPTY_RUNTIME);

export function useOverlayRuntime(): OverlayRuntime {
  return useContext(OverlayRuntimeContext);
}
