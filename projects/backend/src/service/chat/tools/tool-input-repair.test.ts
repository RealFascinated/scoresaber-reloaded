import {
  ChatComparePlayersToolInputSchema,
  ChatGetPlayerHistoryToolInputSchema,
  ChatGetScoreHistoryToolInputSchema,
} from "@ssr/common/schemas/chat/tools/player-tools";
import { InvalidToolInputError, type JSONSchema7 } from "ai";
import { describe, expect, it } from "bun:test";
import { createToolInputRepair, type ToolInputRepairKind } from "./tool-input-repair";

const repairToolInput = createToolInputRepair();

function repair(input: string, schema: object) {
  return repairToolInput({
    toolCall: { type: "tool-call", toolCallId: "1", toolName: "tool", input },
    inputSchema: async () => schema as JSONSchema7,
    error: new InvalidToolInputError({ toolName: "tool", toolInput: input, cause: new Error("invalid") }),
  } as unknown as Parameters<typeof repairToolInput>[0]);
}

describe("repairToolInput", () => {
  it("quotes a long numeric id without losing digits", async () => {
    const repaired = await repair(
      '{"playerId": 76561199089093491, "days": 30}',
      ChatGetPlayerHistoryToolInputSchema
    );

    expect(JSON.parse(repaired?.input ?? "{}")).toEqual({ playerId: "76561199089093491", days: 30 });
  });

  it("repairs every id in a call", async () => {
    const repaired = await repair(
      '{"a": 76561199089093491, "b": 76561198449412081}',
      ChatComparePlayersToolInputSchema
    );

    expect(JSON.parse(repaired?.input ?? "{}")).toEqual({ a: "76561199089093491", b: "76561198449412081" });
  });

  it("converts a short number sent for a string field", async () => {
    const repaired = await repair('{"playerId": 12345}', ChatGetPlayerHistoryToolInputSchema);

    expect(JSON.parse(repaired?.input ?? "{}")).toEqual({ playerId: "12345" });
  });

  it("converts a numeric string sent for an integer field", async () => {
    const repaired = await repair('{"leaderboardId": "412345"}', ChatGetScoreHistoryToolInputSchema);

    expect(JSON.parse(repaired?.input ?? "{}")).toEqual({ leaderboardId: 412345 });
  });

  it("converts booleans, arrays and objects sent as text", async () => {
    const schema = {
      type: "object",
      properties: {
        flag: { type: "boolean" },
        list: { type: "array", items: { type: "integer" } },
        nested: { type: "object", properties: { n: { type: "integer" } } },
      },
    };
    const repaired = await repair(
      '{"flag":"True","list":"[1,\\"2\\"]","nested":"{\\"n\\":\\"7\\"}"}',
      schema
    );

    expect(JSON.parse(repaired?.input ?? "{}")).toEqual({ flag: true, list: [1, 2], nested: { n: 7 } });
  });

  it("wraps a lone value for an array field and handles optional unions", async () => {
    const schema = {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
        page: { anyOf: [{ type: "integer" }, { type: "null" }] },
      },
    };
    const repaired = await repair('{"ids": 76561199089093491, "page": "3"}', schema);

    expect(JSON.parse(repaired?.input ?? "{}")).toEqual({ ids: ["76561199089093491"], page: 3 });
  });

  it("leaves strings that merely contain digits, decimals and short numbers alone", async () => {
    expect(
      await repair('{"playerId":"76561199089093491","days":30}', ChatGetPlayerHistoryToolInputSchema)
    ).toBeNull();
    expect(
      await repair('{"playerId":"x","note":"id 76561199089093491"}', ChatGetPlayerHistoryToolInputSchema)
    ).toBeNull();
    expect(
      await repair('{"playerId":"x","days":1.1234567890123456}', ChatGetPlayerHistoryToolInputSchema)
    ).toBeNull();
  });

  it("gives up on unparseable input and on errors that are not invalid input", async () => {
    expect(await repair("not json", ChatGetPlayerHistoryToolInputSchema)).toBeNull();
    expect(
      await repairToolInput({
        toolCall: { type: "tool-call", toolCallId: "1", toolName: "x", input: "{}" },
        inputSchema: async () => ({}),
        error: new Error("other"),
      } as unknown as Parameters<typeof repairToolInput>[0])
    ).toBeNull();
  });
});

describe("createToolInputRepair outcome", () => {
  const call = (input: string, onOutcome: (toolName: string, kinds: ToolInputRepairKind[]) => void) =>
    createToolInputRepair(onOutcome)({
      toolCall: { type: "tool-call", toolCallId: "1", toolName: "getPlayerHistory", input },
      inputSchema: async () => ChatGetPlayerHistoryToolInputSchema as JSONSchema7,
      error: new InvalidToolInputError({
        toolName: "getPlayerHistory",
        toolInput: input,
        cause: new Error("invalid"),
      }),
    } as unknown as Parameters<typeof repairToolInput>[0]);

  it("reports the kinds that were repaired", async () => {
    const outcomes: [string, ToolInputRepairKind[]][] = [];
    await call('{"playerId": 76561199089093491, "days": "30"}', (tool, kinds) =>
      outcomes.push([tool, kinds])
    );

    expect(outcomes).toEqual([["getPlayerHistory", ["long_integer", "string_to_number"]]]);
  });

  it("reports an empty list when nothing could be repaired", async () => {
    const outcomes: [string, ToolInputRepairKind[]][] = [];
    await call('{"playerId": "x", "days": 500}', (tool, kinds) => outcomes.push([tool, kinds]));

    expect(outcomes).toEqual([["getPlayerHistory", []]]);
  });
});
