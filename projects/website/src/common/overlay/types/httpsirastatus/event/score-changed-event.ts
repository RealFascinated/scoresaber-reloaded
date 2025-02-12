import { HttpSiraStatus_Status } from "@/common/overlay/types/httpsirastatus/data/status";
import { HttpSiraStatusBaseEvent } from "@/common/overlay/types/httpsirastatus/event/base-event";

export interface HttpSiraStatusScoreChangedEvent extends HttpSiraStatusBaseEvent {
  /**
   * The current status of the game.
   */
  status: HttpSiraStatus_Status;

  /**
   * The UNIX timestamp for when the event was received.
   */
  time: number;
}
