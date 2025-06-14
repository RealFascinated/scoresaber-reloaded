export type ReplayViewer = {
  /**
   * The name of the replay viewer.
   */
  name: string;

  /**
   * Gets the URL for a replay.
   *
   * @param id the id of the replay
   * @returns the URL
   */
  generateUrl: (id: number, customParams?: string) => string;
};

/**
 * The replay viewers.
 */
export const ReplayViewers: Record<string, ReplayViewer> = {
  beatleader: {
    name: "BeatLeader",
    generateUrl: (id, replayUrl) =>
      `https://replay.beatleader.xyz/${replayUrl ? `?url=${replayUrl}` : `?scoreId=${id}`}`,
  },
  arcviewer: {
    name: "ArcViewer",
    generateUrl: (id, replayUrl) =>
      `https://allpoland.github.io/ArcViewer/${replayUrl ? `?replayURL=${replayUrl}` : `?scoreID=${id}`}`,
  },
};

export type ReplayViewerTypes = keyof typeof ReplayViewers;
