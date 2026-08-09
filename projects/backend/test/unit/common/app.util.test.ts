import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getAppVersion } from "../../../src/common/app.util";

describe("getAppVersion", () => {
  const originalAppVersion = process.env.APP_VERSION;
  const originalSourceCommit = process.env.SOURCE_COMMIT;

  beforeEach(() => {
    delete process.env.APP_VERSION;
    delete process.env.SOURCE_COMMIT;
  });

  afterEach(() => {
    if (originalAppVersion === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = originalAppVersion;
    }

    if (originalSourceCommit === undefined) {
      delete process.env.SOURCE_COMMIT;
    } else {
      process.env.SOURCE_COMMIT = originalSourceCommit;
    }
  });

  const cases = [
    {
      name: "reads package version and uses dev suffix when commit missing",
      appVersion: undefined as string | undefined,
      sourceCommit: undefined as string | undefined,
      expected: "1.0.0-dev",
    },
    {
      name: "uses first seven characters of source commit",
      appVersion: "2.3.4",
      sourceCommit: "abcdef1234567890",
      expected: "2.3.4-abcdef1",
    },
    {
      name: "uses full short commit when shorter than seven characters",
      appVersion: "9.9.9",
      sourceCommit: "abc",
      expected: "9.9.9-abc",
    },
    {
      name: "caches app version from package.json on first call",
      appVersion: undefined as string | undefined,
      sourceCommit: "1111111",
      expected: "1.0.0-1111111",
    },
    {
      name: "empty source commit uses empty suffix",
      appVersion: "1.0.0",
      sourceCommit: "",
      expected: "1.0.0-",
    },
  ] as const;

  for (const { name, appVersion, sourceCommit, expected } of cases) {
    test(name, async () => {
      delete process.env.APP_VERSION;

      if (appVersion !== undefined) {
        process.env.APP_VERSION = appVersion;
      }
      if (sourceCommit !== undefined) {
        process.env.SOURCE_COMMIT = sourceCommit;
      }

      await expect(getAppVersion()).resolves.toBe(expected);
    });
  }

  test("persists package version in APP_VERSION env after first call", async () => {
    delete process.env.APP_VERSION;
    process.env.SOURCE_COMMIT = "deadbeef";

    await expect(getAppVersion()).resolves.toBe("1.0.0-deadbee");
    expect(process.env.APP_VERSION).toBe("1.0.0");
  });
});
