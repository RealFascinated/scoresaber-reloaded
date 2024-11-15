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
    generateUrl: (id, customParams) => `https://beatleader.xyz/replay/${customParams ? customParams : id}`,
  },
  arcviewer: {
    name: "ArcViewer",
    generateUrl: id => `https://allpoland.github.io/ArcViewer/?scoreID=${id}`,
  },
};

export type ReplayViewerTypes = keyof typeof ReplayViewers;
