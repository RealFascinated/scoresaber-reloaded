import { jsonSchema, tool, type ModelMessage, type ToolSet } from "ai";
import { describe, expect, it } from "bun:test";
import { findUnseenIds, guardToolPrerequisites } from "./tool-prerequisites";

const messages: ModelMessage[] = [
  { role: "user", content: "How did I do on the map at https://scoresaber.com/leaderboard/777001?" },
  {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: "call-a",
        toolName: "resolveMap",
        output: {
          type: "json",
          value: { maps: [{ leaderboardId: 412345 }], scores: [{ scoreId: 90000123 }] },
        },
      },
    ],
  },
];

describe("findUnseenIds", () => {
  it("accepts ids from tool results and from the user's message", () => {
    expect(findUnseenIds({ leaderboardId: 412345 }, messages)).toEqual([]);
    expect(findUnseenIds({ leaderboardId: 777001, scoreId: 90000123 }, messages)).toEqual([]);
  });

  it("flags ids the conversation never produced", () => {
    expect(findUnseenIds({ leaderboardId: 555555 }, messages)).toEqual([
      { field: "leaderboardId", id: "555555" },
    ]);
    expect(findUnseenIds({ scoreId: "90000124" }, messages)).toEqual([{ field: "scoreId", id: "90000124" }]);
  });

  it("does not match an id inside a longer number", () => {
    expect(findUnseenIds({ leaderboardId: 41234 }, messages)).toEqual([
      { field: "leaderboardId", id: "41234" },
    ]);
    expect(findUnseenIds({ leaderboardId: 4123456 }, messages)).toEqual([
      { field: "leaderboardId", id: "4123456" },
    ]);
  });

  it("checks nested and array ids and ignores other fields", () => {
    expect(findUnseenIds({ maps: [{ leaderboardId: 412345 }, { leaderboardId: 111111 }] }, messages)).toEqual(
      [{ field: "leaderboardId", id: "111111" }]
    );
    expect(findUnseenIds({ leaderboardIds: [412345, 222222] }, messages)).toEqual([
      { field: "leaderboardIds", id: "222222" },
    ]);
    expect(findUnseenIds({ page: 99999, playerId: "76561199089093491" }, messages)).toEqual([]);
  });
});

describe("guardToolPrerequisites", () => {
  const tools = {
    getScoreHistory: tool({
      description: "history",
      inputSchema: jsonSchema<{ leaderboardId: number }>({ type: "object" }),
      execute: input => ({ ran: input.leaderboardId }),
    }),
  } satisfies ToolSet;

  const run = (input: { leaderboardId: number }, blocked: string[] = []) => {
    const guarded = guardToolPrerequisites(tools, (name, field) => blocked.push(`${name}:${field}`));
    return guarded.getScoreHistory.execute?.(input, { toolCallId: "call-b", messages, context: undefined });
  };

  it("runs a call whose id came from the conversation", async () => {
    expect(await run({ leaderboardId: 412345 })).toEqual({ ran: 412345 });
  });

  it("rejects a guessed id with an actionable error and reports the block", async () => {
    const blocked: string[] = [];

    expect(() => run({ leaderboardId: 555555 }, blocked)).toThrow("555555");
    expect(blocked).toEqual(["getScoreHistory:leaderboardId"]);
    try {
      run({ leaderboardId: 555555 });
    } catch (error) {
      expect(JSON.parse((error as Error).message)).toMatchObject({
        code: "invalid_input",
        retryable: false,
        hint: expect.stringContaining("resolveMap"),
      });
    }
  });
});
