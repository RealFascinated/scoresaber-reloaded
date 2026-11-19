import type { ChatDisplayMessage } from "@/components/chat/chat-display";
import { describe, expect, test } from "bun:test";
import { buildChatEntityIndex } from "./chat-entity-index";

const message: ChatDisplayMessage = {
  id: "1",
  role: "assistant",
  parts: [
    {
      kind: "tool",
      toolName: "searchPlayers",
      state: "available",
      output: {
        players: [{ id: "7656", name: "Fascinated", country: "GB", rank: 5, countryRank: 1, pp: 1000 }],
      },
    },
    {
      kind: "tool",
      toolName: "getPlayerScores",
      state: "available",
      output: {
        scores: [
          {
            leaderboardId: 42,
            mapName: "Song",
            mapper: "Artist",
            difficulty: "ExpertPlus",
            stars: 7.1,
            ranked: true,
          },
        ],
      },
    },
  ],
};

describe("buildChatEntityIndex", () => {
  test("indexes players and maps from tool outputs by id", () => {
    const index = buildChatEntityIndex([message]);
    expect(index.players.get("7656")?.name).toBe("Fascinated");
    expect(index.players.get("7656")?.pp).toBe(1000);
    expect(index.maps.get("42")?.name).toBe("Song");
    expect(index.maps.get("42")?.stars).toBe(7.1);
  });
});
