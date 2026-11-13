import { isProduction } from "./utils/utils";

export const SHARED_CONSTS = {
  maxStars: 15,
  maxFollowing: 15,
  maxPinnedScores: 9,
  maxPinnedScoreMessageLength: 200,
};

export const SERVER_PROXIES = [
  "", // No proxy
  ...(isProduction() ? ["https://proxy.fascinated.cc/"] : []),
];
export const CLIENT_PROXY = "https://proxy.fascinated.cc/";
