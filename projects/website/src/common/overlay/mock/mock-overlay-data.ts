import type { OverlayData } from "@/common/overlay/overlay-data";
import type { OverlayPlayer } from "@/common/overlay/overlay-player";
import type { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import type { BeatLeaderOverlayDataResponse } from "@ssr/common/schemas/response/beatleader/overlay-data";
import type {
  BeatLeaderOverlayPlayerResponse,
  BeatLeaderOverlayRatingsResponse,
} from "@ssr/common/schemas/response/beatleader/overlay-ratings";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";

export const MOCK_SONG_LENGTH = 145;

export const MOCK_BEAT_SAVER_MAP: BeatSaverMap = {
  id: "3c778",
  name: "Dopam!ne - Cranky Clown",
  description: "Crouch + Dodge",
  bsr: "3c778",
  songArt: "https://cdn.scoresaber.com/covers/60A83AA6FF994D786363CDA4A6FDD3278506E34A.png",
  author: {
    id: 4285647,
    name: "Gabriel",
    hash: "5e8153a82a340900068684a3",
    avatar: "https://cdn.beatsaver.com/avatar/03791f839816d05063c07e6b01ee33a9e6b8e6d6.png",
    type: "DISCORD",
    admin: false,
    curator: true,
    seniorCurator: false,
    verifiedMapper: true,
    playlistUrl: "https://api.beatsaver.com/users/id/4285647/playlist",
  },
  difficulty: {
    njs: 13,
    offset: -1.307,
    notes: 590,
    bombs: 22,
    obstacles: 520,
    nps: 4.239,
    length: 464,
    characteristic: "Standard",
    difficulty: "Normal",
    events: 4433,
    chroma: false,
    mappingExtensions: false,
    noodleExtensions: false,
    cinema: false,
    seconds: 139.2,
    maxScore: 535555,
    label: "",
  },
  metadata: {
    bpm: 200,
    duration: MOCK_SONG_LENGTH,
    songName: "Cranky Clown",
    songSubName: "",
    songAuthorName: "Dopam!ne",
    songAuthorUrl: "",
    levelAuthorName: "Gabriel",
  },
};

export const MOCK_LEADERBOARD: ScoreSaberLeaderboard = {
  id: 629379,
  fullName: "Cranky Clown",
  songHash: "60A83AA6FF994D786363CDA4A6FDD3278506E34A",
  songName: "Cranky Clown",
  songSubName: "",
  songAuthorName: "Dopam!ne",
  songArt: "https://cdn.scoresaber.com/covers/60A83AA6FF994D786363CDA4A6FDD3278506E34A.png",
  levelAuthorName: "Gabriel",
  difficulty: { id: 629379, stars: 5.44, difficulty: "Normal", characteristic: "Standard" },
  difficulties: [{ id: 629379, stars: 5.44, difficulty: "Normal", characteristic: "Standard" }],
  maxScore: 535555,
  ranked: true,
  qualified: false,
  stars: 5.44,
  status: "Ranked",
  plays: 527,
  dailyPlays: 1,
  timestamp: new Date("2024-10-22T19:10:16.000Z"),
};

export const MOCK_PLAYER: OverlayPlayer = {
  name: "Player",
  avatar: "https://ssr.fascinated.cc/assets/unknown.png",
  country: "GB",
  pp: 12345.67,
  rank: 123,
  countryRank: 12,
  medals: 42,
  daily: { rank: 2, countryRank: 0, medals: 1, pp: 8.5 },
};

/** A fake PB: a steady climb to 97.5% with a little noise, null before the first note. */
export const MOCK_PB: BeatLeaderOverlayDataResponse = (() => {
  const accuracyBySecond: (number | null)[] = [];
  for (let second = 0; second <= MOCK_SONG_LENGTH; second++) {
    if (second < 4) {
      accuracyBySecond.push(null);
      continue;
    }
    const noise = Math.sin(second * 1.7) * 0.6 * Math.exp(-second / 40);
    accuracyBySecond.push(Math.round((97.5 + noise) * 100) / 100);
  }
  return { scoreId: 0, source: "replay", finalAccuracy: 97.5, accuracyBySecond };
})();

export type MockScenario = "playing" | "inSong" | "paused" | "menu";

export const MOCK_SCENARIOS: { id: MockScenario; label: string }[] = [
  { id: "playing", label: "Playing" },
  { id: "inSong", label: "In song (static)" },
  { id: "paused", label: "Paused" },
  { id: "menu", label: "Menu" },
];

const STATIC_SONG_TIME = 62;

/**
 * Gets the data the overlay would receive in a scenario.
 *
 * @param scenario what the game is doing
 * @param elapsedSeconds how long the scenario has been running, drives the simulated play
 */
export function getMockOverlayData(scenario: MockScenario, elapsedSeconds: number): OverlayData {
  if (scenario === "menu") {
    return {};
  }

  const map = { beatSaverMap: MOCK_BEAT_SAVER_MAP, leaderboard: MOCK_LEADERBOARD };
  const time = scenario === "playing" ? elapsedSeconds % MOCK_SONG_LENGTH : STATIC_SONG_TIME;
  const pbAtTime = MOCK_PB.accuracyBySecond[Math.floor(time)] ?? 96;
  // Drifts above and below the PB so the delta changes sign
  const accuracy = Math.min(100, pbAtTime + Math.sin(time / 9) * 0.9 + 0.1);
  const combo = scenario === "playing" ? Math.floor(time * 4.2) : 260;

  return {
    map,
    score: { accuracy, combo, score: Math.round(accuracy * 5355.55 * (time / MOCK_SONG_LENGTH)) },
    paused: scenario === "paused",
    songTime: time,
    songLength: MOCK_SONG_LENGTH,
    // Without a sync time the song time stands still, which is what the static scenarios are for
    songTimeSyncedAt: scenario === "playing" ? Date.now() : undefined,
  };
}

export const MOCK_BL_PLAYER: BeatLeaderOverlayPlayerResponse = { pp: 11890.12, rank: 210, countryRank: 18 };

/** A ranked BeatLeader difficulty with the rebalanced ratings (the ExpertPlus of the mock song). */
export const MOCK_RATINGS: BeatLeaderOverlayRatingsResponse = {
  ranked: true,
  stars: 10.563216,
  accRating: 12.3930235,
  passRating: 6.931391,
  techRating: 6.1356697,
  predictedAcc: 0.9892079,
  sliderPercentage: 0,
  notes: 590,
  noteSpan: 139.2,
};
