import { HttpSiraStatusBaseEvent } from "@/common/overlay/types/httpsirastatus/event/base-event";
import { HttpSiraStatus_Status } from "@/common/overlay/types/httpsirastatus/data/status";

export interface HttpSiraStatusHelloEvent extends HttpSiraStatusBaseEvent {
  /**
   * The current status of the game.
   */
  status: HttpSiraStatus_Status;

  /**
   * The UNIX timestamp for when the event was received.
   */
  time: number;
}
