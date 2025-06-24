import { DetailType } from "@ssr/common/detail-type";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import OverlayDataClient from "../data-client";
import { resetOverlayData, useOverlayDataStore } from "../overlay-data-store";
import { BeatSaberPlus_GameStateEvent } from "../types/beatsaberplus/event/game-state";
import { BeatSaberPlus_MapInfoEvent } from "../types/beatsaberplus/event/map-info";
import { BeatSaberPlus_ScoreEvent } from "../types/beatsaberplus/event/score";

type EventName = keyof EventHandlers;
type EventHandlers = {
  mapInfo: (data: BeatSaberPlus_MapInfoEvent) => Promise<void>;
  score: (data: BeatSaberPlus_ScoreEvent) => Promise<void>;
  gameState: (data: BeatSaberPlus_GameStateEvent) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
};

const handlers: EventHandlers = {
  mapInfo: async ({ mapInfoChanged }: BeatSaberPlus_MapInfoEvent) => {
    const { difficulty, characteristic, level_id: levelId } = mapInfoChanged;
    const mapHash = levelId.split("custom_level_")[1].toUpperCase();

    const previousState = useOverlayDataStore.getState();

    if (previousState && !previousState.map && difficulty && characteristic && mapHash) {
      useOverlayDataStore.setState({
        map: {
          beatSaverMap: await ssrApi.getBeatSaverMap(
            mapHash,
            difficulty as MapDifficulty,
            characteristic as MapCharacteristic,
            DetailType.FULL
          ),
          leaderboard: (
            await ssrApi.fetchLeaderboardByHash(
              mapHash,
              difficulty as MapDifficulty,
              characteristic as MapCharacteristic
            )
          )?.leaderboard,
        },
      });
    }
  },
  score: async ({ scoreEvent }: BeatSaberPlus_ScoreEvent) => {
    const { accuracy, combo, score } = scoreEvent;

    const previousState = useOverlayDataStore.getState();
    useOverlayDataStore.setState({
      score: {
        ...previousState.score,
        score: score,
        combo: combo,
        accuracy: accuracy * 100,
      },
    });
  },
  gameState: async ({ gameStateChanged }: BeatSaberPlus_GameStateEvent) => {
    if (gameStateChanged === "Menu") {
      resetOverlayData();
    }
  },
  pause: async () => {
    useOverlayDataStore.setState({
      paused: true,
    });
  },
  resume: async () => {
    useOverlayDataStore.setState({
      paused: false,
    });
  },
};

export default class BeatSaberPlusClient extends OverlayDataClient {
  constructor() {
    super("BeatSaberPlus", "ws://localhost:2947/socket");
  }

  onMessage(message: string) {
    const data = JSON.parse(message);
    console.log(data);
    if (!isValidEventName(data._event)) {
      return;
    }
    handlers[data._event as EventName](data);
  }
}

/**
 * Checks if the event is a valid EventName
 *
 * @param event the event to check
 * @returns whether the event is a valid EventName
 */
function isValidEventName(event: unknown): event is EventName {
  return typeof event === "string" && event in handlers;
}
