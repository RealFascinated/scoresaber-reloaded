import { parseSchema } from "@ssr/common/schemas/parse";
import { ScoreSaberLeaderboardSchema } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScoreSchema } from "@ssr/common/schemas/scoresaber/score/score";
import { ScoreSaberLeaderboardToken } from "@ssr/common/schemas/scoresaber/tokens/v1/leaderboard";
import { ScoreSaberScoreToken } from "@ssr/common/schemas/scoresaber/tokens/v1/score";
import { getScoreSaberLeaderboardFromToken, getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { describe, expect, test } from "bun:test";

// The token creators skip `parseSchema` when a compiled check passes. These tests make sure that
// shortcut stays equal to what `parseSchema` returns (e.g. when a schema gains a default or codec).

const leaderboardToken = {
  id: 1,
  songHash: "abc",
  songName: "Song",
  songSubName: "Sub",
  songAuthorName: "Author",
  levelAuthorName: "Mapper",
  difficulty: { leaderboardId: 1, difficulty: 9, gameMode: "SoloStandard" },
  maxScore: 1_000_000,
  createdDate: "2023-01-01T00:00:00Z",
  rankedDate: "2023-02-01T00:00:00Z",
  qualifiedDate: null,
  ranked: true,
  qualified: false,
  stars: 7.5,
  plays: 10,
  dailyPlays: 1,
  coverImage: "http://example.com/cover.png",
} as unknown as ScoreSaberLeaderboardToken;

const scoreToken = {
  id: 5,
  leaderboardPlayerInfo: { id: "1", name: "Name", profilePicture: "pic", country: "GB", role: null },
  rank: 3,
  baseScore: 900_000,
  pp: 300.5,
  weight: 0.9,
  modifiers: "",
  badCuts: 0,
  missedNotes: 1,
  maxCombo: 500,
  fullCombo: false,
  hmd: 64,
  deviceHmd: "Valve Index",
  deviceControllerLeft: "left",
  deviceControllerRight: "right",
  timeSet: "2023-01-01T00:00:00Z",
} as unknown as ScoreSaberScoreToken;

const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);

/** What the score creator returned before the shortcut: the object passed through `parseSchema`. */
function parseScoreWithSchema(token: ScoreSaberScoreToken) {
  const score = getScoreSaberScoreFromToken(token, leaderboard);
  return parseSchema(ScoreSaberScoreSchema, {
    ...score,
    pp: token.pp,
    weight: token.weight,
    hmd: score.hmd,
    playerInfo: score.playerInfo && {
      ...score.playerInfo,
      avatar: token.leaderboardPlayerInfo.profilePicture,
    },
  });
}

describe("getScoreSaberScoreFromToken", () => {
  const cases: [string, Partial<Record<string, unknown>>][] = [
    ["a regular score", {}],
    ["null pp and weight", { pp: null, weight: null }],
    ["no device hmd, known hmd id", { deviceHmd: undefined }],
    ["no device hmd, unknown hmd id", { deviceHmd: undefined, hmd: 999 }],
    ["modifiers", { modifiers: "NF,SS" }],
    ["no controllers", { deviceControllerLeft: null, deviceControllerRight: null }],
    ["a player role", { leaderboardPlayerInfo: { id: "1", name: "n", profilePicture: "p", role: "Admin" } }],
    ["a null avatar", { leaderboardPlayerInfo: { id: "1", name: "n", profilePicture: null } }],
    ["a missing avatar", { leaderboardPlayerInfo: { id: "1", name: "n" } }],
  ];

  for (const [name, patch] of cases) {
    test(`matches parseSchema for ${name}`, () => {
      const token = { ...scoreToken, ...patch } as unknown as ScoreSaberScoreToken;
      const score = getScoreSaberScoreFromToken(token, leaderboard);
      expect(score).toEqual(parseScoreWithSchema(token));
      expect(score.pp).toBeNumber();
      expect(score.weight).toBeNumber();
      expect(score.hmd).toBeString();
      expect(score.playerInfo?.avatar).toBeString();
      expect(score.timestamp).toBeInstanceOf(Date);
    });
  }

  test("still throws on an invalid timestamp", () => {
    const token = { ...scoreToken, timeSet: "garbage" } as unknown as ScoreSaberScoreToken;
    expect(() => getScoreSaberScoreFromToken(token, leaderboard)).toThrow();
  });

  test("still throws on an unknown modifier", () => {
    const token = { ...scoreToken, modifiers: "XX" } as unknown as ScoreSaberScoreToken;
    expect(() => getScoreSaberScoreFromToken(token, leaderboard)).toThrow();
  });
});

describe("getScoreSaberLeaderboardFromToken", () => {
  test("returns what parseSchema returns", () => {
    const created = getScoreSaberLeaderboardFromToken(leaderboardToken);
    expect(created).toEqual(parseSchema(ScoreSaberLeaderboardSchema, created));
    expect(created.timestamp).toBeInstanceOf(Date);
    expect(created.rankedDate).toBeInstanceOf(Date);
    expect(created.qualifiedDate).toBeUndefined();
  });

  test("still throws on an invalid creation date", () => {
    const token = { ...leaderboardToken, createdDate: "bad" } as unknown as ScoreSaberLeaderboardToken;
    expect(() => getScoreSaberLeaderboardFromToken(token)).toThrow();
  });
});
