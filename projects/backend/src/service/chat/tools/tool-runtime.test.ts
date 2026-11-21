import { GetSuggestedMapsInputSchema } from "@ssr/common/schemas/chat/tools/map-tools";
import { describe, expect, it } from "bun:test";
import { ChatToolError, runTool, toolSchema } from "./tool-runtime";

function getValidate() {
  const validate = toolSchema(GetSuggestedMapsInputSchema).validate;
  if (validate === undefined) {
    throw new Error("Tool schema has no validate function");
  }
  return validate;
}

describe("toolSchema", () => {
  it("accepts valid input", async () => {
    const result = await getValidate()({ playerId: "76561198000000000", limit: 25 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.limit).toBe(25);
    }
  });

  it("rejects a limit above the tool maximum", async () => {
    const result = await getValidate()({ limit: 100000 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("limit");
    }
  });

  it("rejects a non-string player id", async () => {
    const result = await getValidate()({ playerId: true });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("playerId");
    }
  });
});

describe("runTool", () => {
  it("returns the action result", async () => {
    expect(await runTool(async () => ({ ok: true }))).toEqual({ ok: true });
  });

  it("rethrows a ChatToolError untouched", async () => {
    const error = new ChatToolError("not_found", "Missing", "Search first");

    await expect(runTool(async () => Promise.reject(error))).rejects.toBe(error);
    expect(JSON.parse(error.message)).toEqual({
      code: "not_found",
      message: "Missing",
      retryable: false,
      hint: "Search first",
    });
  });

  it("wraps unexpected errors as retryable without leaking the cause message", async () => {
    const cause = new Error("connection to 10.0.0.1 refused");
    const thrown = await runTool(async () => Promise.reject(cause), "Could not load.").catch(
      (error: Error) => error
    );

    expect(thrown).toBeInstanceOf(ChatToolError);
    expect(thrown.message).not.toContain("10.0.0.1");
    expect(JSON.parse(thrown.message)).toMatchObject({
      code: "unavailable",
      message: "Could not load.",
      retryable: true,
    });
    expect(thrown.cause).toBe(cause);
  });
});

describe("toolSchema received type", () => {
  it("names the type that was received", async () => {
    const result = await getValidate()({ playerId: true });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("got a boolean");
    }
  });
});

describe("toolSchema numeric player ids", () => {
  it("rejects a player id sent as a number instead of rounding it", async () => {
    const result = await getValidate()({ playerId: 76561198449412080 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("got a number");
      expect(result.error.message).toContain("wrap them in quotes");
    }
  });
});
