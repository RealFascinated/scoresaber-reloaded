/**
 * Checks that an event name from a data client has a handler, so unknown events are ignored.
 *
 * @param handlers the handlers of an overlay, keyed by event name
 * @param event the event name received from the data client
 */
export function isHandledEventName<T extends object>(handlers: T, event: unknown): event is keyof T {
  return typeof event === "string" && Object.hasOwn(handlers, event);
}
