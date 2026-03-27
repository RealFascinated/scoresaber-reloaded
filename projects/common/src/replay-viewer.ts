export type ReplayViewer = {
  /**
   * The id of the replay viewer.
   */
  id: string;

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
    id: "beatleader",
    name: "BeatLeader",
    generateUrl: (id, replayUrl) =>
      `https://replay.beatleader.xyz/${replayUrl ? `?link=${replayUrl}` : `?scoreId=${id}`}`,
  },
  arcviewer: {
    id: "arcviewer",
    name: "ArcViewer",
    generateUrl: (id, replayUrl) =>
      `https://allpoland.github.io/ArcViewer/${replayUrl ? `?replayURL=${replayUrl}` : `?scoreID=${id}`}`,
  },
};

export type ReplayViewerTypes = keyof typeof ReplayViewers;
