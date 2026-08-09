import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import CacheService, { CacheId } from "../../../src/service/infra/cache.service";

describe("CacheService", () => {
  const originalAppEnv = process.env.NEXT_PUBLIC_APP_ENV;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_ENV = "development";
  });

  afterEach(() => {
    if (originalAppEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_ENV;
    } else {
      process.env.NEXT_PUBLIC_APP_ENV = originalAppEnv;
    }
  });

  describe("CACHE_INFO", () => {
    test("defines ttl and mode for every cache id", () => {
      for (const cacheId of Object.values(CacheId)) {
        const info = CacheService.CACHE_INFO[cacheId];
        expect(info.ttl).toBeGreaterThan(0);
        expect(["REDIS", "MEMORY"]).toContain(info.mode);
      }
    });
  });

  describe("development mode bypass", () => {
    test("get returns undefined without touching redis", async () => {
      expect(await CacheService.get(CacheId.BEATSAVER_MAP, "test-key")).toBeUndefined();
    });

    test("insert is a no-op", async () => {
      await expect(CacheService.insert(CacheId.BEATSAVER_MAP, "test-key", { ok: true })).resolves.toBeUndefined();
    });

    test("fetch delegates directly to fetchFn", async () => {
      let calls = 0;
      const value = await CacheService.fetch(CacheId.BEATSAVER_MAP, "test-key", async () => {
        calls += 1;
        return "fresh";
      });

      expect(value).toBe("fresh");
      expect(calls).toBe(1);
    });
  });
});
