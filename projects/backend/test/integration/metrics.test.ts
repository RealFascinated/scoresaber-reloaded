import { env } from "@ssr/common/env";
import { describe, expect, test } from "bun:test";
import { expectStatus } from "../helpers/assertions";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

describe("GET /metrics", () => {
  const app = createTestApp();

  test("returns prometheus text with registered metric families in development", async () => {
    const response = await request(app, "/metrics");
    expectStatus(response, 200);
    expect(response.headers.get("content-type")).toContain("text/plain");

    const body = await response.text();
    expect(body).toContain("memory_usage_heap_size_bytes");
    expect(body).toContain("tracked_scores");
    expect(body).toContain("total_requests");
  });

  describe("with production authentication enabled", () => {
    test("rejects requests without a bearer token", async () => {
      env.NEXT_PUBLIC_APP_ENV = "production";
      try {
        const response = await request(app, "/metrics");
        expectStatus(response, 401);
      } finally {
        env.NEXT_PUBLIC_APP_ENV = "development";
      }
    });

    test("rejects requests with an incorrect bearer token", async () => {
      env.NEXT_PUBLIC_APP_ENV = "production";
      try {
        const response = await request(app, "/metrics", {
          headers: { authorization: "Bearer wrong-token" },
        });
        expectStatus(response, 401);
      } finally {
        env.NEXT_PUBLIC_APP_ENV = "development";
      }
    });

    test("returns metrics for the configured bearer token", async () => {
      env.NEXT_PUBLIC_APP_ENV = "production";
      try {
        const response = await request(app, "/metrics", {
          headers: { authorization: "Bearer test-prometheus-token" },
        });
        expectStatus(response, 200);

        const body = await response.text();
        expect(body).toContain("memory_usage_heap_size_bytes");
      } finally {
        env.NEXT_PUBLIC_APP_ENV = "development";
      }
    });
  });
});
