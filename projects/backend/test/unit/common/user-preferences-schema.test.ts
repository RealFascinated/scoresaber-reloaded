import {
  DEFAULT_USER_PREFERENCES,
  UserPreferencesPatchSchema,
  UserPreferencesSchema,
} from "@ssr/common/schemas/user/preferences";
import { describe, expect, test } from "bun:test";
import { Value } from "typebox/value";

describe("user preferences schema", () => {
  test("the defaults satisfy the schema", () => {
    expect(Value.Check(UserPreferencesSchema, DEFAULT_USER_PREFERENCES)).toBe(true);
  });

  test("a patch can be empty or hold any subset of the preferences", () => {
    expect(Value.Check(UserPreferencesPatchSchema, {})).toBe(true);
    expect(Value.Check(UserPreferencesPatchSchema, { showKitty: true, whatIfRange: [80, 99] })).toBe(true);
    expect(Value.Check(UserPreferencesPatchSchema, { showKitty: "yes" })).toBe(false);
  });
});
