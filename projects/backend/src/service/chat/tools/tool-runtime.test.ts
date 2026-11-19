import { GetSuggestedMapsInputSchema } from "@ssr/common/schemas/chat/tools/map-tools";
import { describe, expect, it } from "bun:test";
import { toolSchema } from "./tool-runtime";

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
    const result = await getValidate()({ playerId: 123 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("playerId");
    }
  });
});
