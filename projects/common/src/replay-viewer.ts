import type { ReplayViewerId } from "./schemas/replay-viewer/replay-viewer-id";

export type ReplayViewer = {
  id: string;

  name: string;

  generateUrl: (id: number, customParams?: string) => string;
};

export const ReplayViewers: Record<ReplayViewerId, ReplayViewer> = {
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
  chroviewer: {
    id: "chroviewer",
    name: "ChroViewer",
    generateUrl: id => `https://replay.fascinated.cc/?scoreIdSSR=${id}&autoplay=true`,
  },
};
