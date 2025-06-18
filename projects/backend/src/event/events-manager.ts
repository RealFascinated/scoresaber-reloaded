import Logger from "@ssr/common/logger";
import { EventListener } from "./event-listener";
import { TrackScoreListener } from "./impl/track-score-listener";

export class EventsManager {
  /**
   * The registered event listeners.
   */
  private static events: EventListener[] = [];

  constructor() {
    EventsManager.registerListener(new TrackScoreListener());
  }

  /**
   * Add an event listener to the events manager.
   *
   * @param eventListener the event listener to add.
   */
  public static registerListener(eventListener: EventListener) {
    if (EventsManager.events.includes(eventListener)) {
      Logger.warn(`Event listener ${eventListener.constructor.name} already registered`);
      return;
    }
    EventsManager.events.push(eventListener);
  }

  /**
   * Get all event listeners.
   *
   * @returns all event listeners.
   */
  public static getListeners() {
    return EventsManager.events;
  }
}
