import { EventListener } from "./event-listener";
import { ScoreNotificationListener } from "./impl/score-notification-listener";
import { TrackScoreListener } from "./impl/track-score-listener";

export class EventsManager {
  /**
   * The registered event listeners.
   */
  private static events: EventListener[] = [];

  constructor() {
    this.addEvent(new TrackScoreListener());
    this.addEvent(new ScoreNotificationListener());
  }

  /**
   * Add an event listener to the events manager.
   *
   * @param eventListener the event listener to add.
   */
  addEvent(eventListener: EventListener) {
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
