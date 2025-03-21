import { HttpSiraStatus_Status } from "@/common/overlay/types/httpsirastatus/data/status";
import { HttpSiraStatusHelloEvent } from "@/common/overlay/types/httpsirastatus/event/hello-event";
import { HttpSiraStatusScoreChangedEvent } from "@/common/overlay/types/httpsirastatus/event/score-changed-event";
import { HttpSiraStatusSongStartedEvent } from "@/common/overlay/types/httpsirastatus/event/song-started-event";
import { DetailType } from "@ssr/common/detail-type";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import OverlayDataClient from "../data-client";
import { resetOverlayData, useOverlayDataStore } from "../overlay-data-store";

type EventName = keyof EventHandlers;
type EventHandlers = {
  hello: (data: HttpSiraStatusHelloEvent) => void;
  songStart: (data: HttpSiraStatusSongStartedEvent) => void;
  scoreChanged: (data: HttpSiraStatusScoreChangedEvent) => void;
  finished: () => void;
  menu: () => void;
  pause: () => void;
  resume: () => void;
};

const handlers: EventHandlers = {
  hello: (data: HttpSiraStatusHelloEvent) => {
    loadStatusData(data.status);
  },
  songStart: (data: HttpSiraStatusSongStartedEvent) => {
    loadStatusData(data.status);
  },
  scoreChanged: (data: HttpSiraStatusScoreChangedEvent) => {
    loadStatusData(data.status);
  },
  finished: () => {
    resetOverlayData();
  },
  menu: () => {
    resetOverlayData();
  },
  pause: () => {
    useOverlayDataStore.setState({
      paused: true,
    });
  },
  resume: () => {
    useOverlayDataStore.setState({
      paused: false,
    });
  },
};

export default class HTTPSiraStatusClient extends OverlayDataClient {
  constructor() {
    super("HTTPSiraStatus", "ws://localhost:6557/socket");
  }

  onMessage(message: string) {
    const data = JSON.parse(message);
    if (!isValidEventName(data.event)) {
      return;
    }
    handlers[data.event as EventName](data);
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

/**
 * Loads the status data into the overlay data.
 *
 * @param status the status data
 */
async function loadStatusData(status: HttpSiraStatus_Status) {
  const performance = status.performance;
  if (!performance) {
    return;
  }

  const previousState = useOverlayDataStore.getState();

  // Initialize the map data if it's not set
  if (previousState && !previousState.map) {
    const beatmap = status.beatmap;
    if (!beatmap || !beatmap.songHash || !beatmap.difficultyEnum || !beatmap.characteristic) {
      return;
    }

    useOverlayDataStore.setState({
      map: {
        beatSaverMap: await ssrApi.getBeatSaverMap(
          beatmap.songHash,
          beatmap.difficultyEnum,
          beatmap.characteristic,
          DetailType.FULL
        ),
        leaderboard: (
          await ssrApi.fetchLeaderboardByHash(
            beatmap.songHash,
            beatmap.difficultyEnum,
            beatmap.characteristic
          )
        )?.leaderboard,
      },
    });
  }

  useOverlayDataStore.setState({
    score: {
      ...previousState.score,
      score: performance.score,
      combo: performance.combo,
      accuracy: performance.relativeScore * 100,
    },
  });
}
