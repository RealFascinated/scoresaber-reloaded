import type { OverlayContent } from "@ssr/common/schemas/response/user/overlay";

export type OverlayUpdateEvent = { type: "layout"; content: OverlayContent } | { type: "deleted" };
export type OverlayUpdateListener = (event: OverlayUpdateEvent) => void;

/** The most streams that can watch one overlay. */
export const MAX_OVERLAY_SUBSCRIBERS = 10;

/**
 * Fans overlay changes out to the open OBS pages that watch the overlay.
 * In memory, so it only reaches the streams connected to this instance.
 */
export class OverlayUpdateBroadcaster {
  private static readonly subscribers = new Map<string, Set<OverlayUpdateListener>>();

  /**
   * Starts watching an overlay.
   *
   * @param overlayId the overlay to watch
   * @param listener called for every change
   * @returns a function that stops watching, or undefined if the overlay has too many watchers
   */
  public static subscribe(overlayId: string, listener: OverlayUpdateListener): (() => void) | undefined {
    let listeners = this.subscribers.get(overlayId);
    if (!listeners) {
      listeners = new Set();
      this.subscribers.set(overlayId, listeners);
    }
    if (listeners.size >= MAX_OVERLAY_SUBSCRIBERS) {
      return undefined;
    }
    listeners.add(listener);

    return () => {
      const current = this.subscribers.get(overlayId);
      if (!current) {
        return;
      }
      current.delete(listener);
      if (current.size === 0) {
        this.subscribers.delete(overlayId);
      }
    };
  }

  /**
   * Sends an event to everyone watching an overlay. A failing listener never affects the others.
   *
   * @param overlayId the overlay that changed
   * @param event what happened
   */
  public static publish(overlayId: string, event: OverlayUpdateEvent): void {
    const listeners = this.subscribers.get(overlayId);
    if (!listeners) {
      return;
    }
    for (const listener of [...listeners]) {
      try {
        listener(event);
      } catch {
        listeners.delete(listener);
      }
    }
    if (event.type === "deleted") {
      this.subscribers.delete(overlayId);
    }
  }
}
