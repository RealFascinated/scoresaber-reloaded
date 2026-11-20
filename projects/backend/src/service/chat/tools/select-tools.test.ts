import { ChatSelectLeaderboardToolInputSchema } from "@ssr/common/schemas/chat/tools/select-tools";
import type { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { checkSchema } from "@ssr/common/schemas/parse";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { describe, expect, it } from "bun:test";
import { buildLeaderboardChoice, buildSongChoice } from "./select-tools";

function makeLeaderboard(id: number, songHash: string, difficulty: MapDifficulty, stars: number) {
  return {
    id,
    fullName: "Song",
    songHash,
    songName: `Song ${songHash.slice(0, 1)}`,
    songSubName: "",
    songAuthorName: "Artist",
    songArt: "https://example.com/cover.png",
    levelAuthorName: "Mapper",
    difficulty: { id, stars, difficulty, characteristic: "Standard" },
    difficulties: [],
    maxScore: 1000,
    ranked: stars > 0,
    qualified: false,
    stars,
    rankedDate: undefined,
    status: "Ranked",
    plays: 10,
    dailyPlays: 1,
    timestamp: new Date("2026-01-01T00:00:00.000Z"),
  } satisfies ScoreSaberLeaderboard;
}

const HASH_A = "A".repeat(40);
const HASH_B = "b".repeat(40);

describe("buildLeaderboardChoice", () => {
  it("keeps the requested order and drops unknown and repeated ids", () => {
    const leaderboards = [
      makeLeaderboard(1, HASH_A, "Expert", 7),
      makeLeaderboard(2, HASH_A, "ExpertPlus", 9),
    ];

    const choice = buildLeaderboardChoice("Which difficulty?", [2, 99, 1, 2], leaderboards);

    expect(choice).toMatchObject({
      kind: "leaderboard-choice",
      question: "Which difficulty?",
      options: [
        { leaderboardId: 2, difficulty: "ExpertPlus", stars: 9 },
        { leaderboardId: 1, difficulty: "Expert", stars: 7 },
      ],
    });
  });

  it("returns an error when fewer than two ids exist", () => {
    const choice = buildLeaderboardChoice("Which?", [1, 99], [makeLeaderboard(1, HASH_A, "Expert", 7)]);

    expect(choice).toEqual({ error: expect.stringContaining("Only 1 of the leaderboard ids exist") });
  });
});

describe("buildSongChoice", () => {
  it("groups difficulties into one option per song, matching hashes case-insensitively", () => {
    const leaderboards = [
      makeLeaderboard(1, HASH_A, "Expert", 7),
      makeLeaderboard(2, HASH_A, "ExpertPlus", 9),
      makeLeaderboard(3, HASH_B, "Hard", 4),
    ];

    const choice = buildSongChoice("Which song?", [HASH_B.toUpperCase(), HASH_A.toLowerCase()], leaderboards);

    expect(choice).toMatchObject({
      kind: "song-choice",
      options: [
        { songHash: HASH_B, difficultyCount: 1, maxStars: 4 },
        { songHash: HASH_A, difficultyCount: 2, maxStars: 9 },
      ],
    });
  });

  it("returns an error when fewer than two songs have a leaderboard", () => {
    const choice = buildSongChoice(
      "Which song?",
      [HASH_A, HASH_B],
      [makeLeaderboard(1, HASH_A, "Expert", 7)]
    );

    expect(choice).toEqual({ error: expect.stringContaining("Only 1 of the song hashes") });
  });
});

describe("ChatSelectLeaderboardToolInputSchema", () => {
  it("requires between two and ten ids", () => {
    expect(
      checkSchema(ChatSelectLeaderboardToolInputSchema, { question: "Which?", leaderboardIds: [1] })
    ).toBe(false);
    expect(
      checkSchema(ChatSelectLeaderboardToolInputSchema, { question: "Which?", leaderboardIds: [1, 2] })
    ).toBe(true);
  });
});
