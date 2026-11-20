import { describe, expect, it } from "bun:test";
import { getToolSummary, readToolError, summarizeToolInput } from "./chat-display";

describe("summarizeToolInput", () => {
  it("joins the scalar arguments and counts arrays", () => {
    expect(
      summarizeToolInput({ playerId: "765611980000000000000000000", page: 1, ids: [1, 2], nested: {} })
    ).toBe("playerId 76561198000000000000000… · page 1 · ids ×2");
  });

  it("is empty without input", () => {
    expect(summarizeToolInput(undefined)).toBe("");
  });
});

describe("readToolError", () => {
  it("reads the structured backend error", () => {
    const text = JSON.stringify({ code: "not_found", message: "Nope", retryable: false, hint: "Search" });

    expect(readToolError(text)).toEqual({
      code: "not_found",
      message: "Nope",
      retryable: false,
      hint: "Search",
    });
  });

  it("shows other errors as written", () => {
    expect(readToolError("Invalid input for tool x")).toEqual({ message: "Invalid input for tool x" });
  });
});

describe("getToolSummary", () => {
  it("shows the failure reason for a failed step", () => {
    const errorText = JSON.stringify({ code: "unavailable", message: "Could not load.", retryable: true });

    expect(getToolSummary({ kind: "tool", toolName: "x", state: "error", errorText })).toBe(
      "Could not load."
    );
  });
});
