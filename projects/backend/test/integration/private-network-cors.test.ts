import { describe, expect, test } from "bun:test";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

describe("private network access", () => {
  const app = createTestApp();

  async function preflight(headers: Record<string, string>) {
    return request(app, "/beatleader/overlay-data/player/76561198449412074", {
      method: "OPTIONS",
      headers: { origin: "https://ssr.fascinated.cc", "access-control-request-method": "GET", ...headers },
    });
  }

  test("grants private network access when the preflight asks for it", async () => {
    const response = await preflight({ "access-control-request-private-network": "true" });
    expect(response.headers.get("access-control-allow-private-network")).toBe("true");
    expect(response.headers.get("access-control-allow-local-network")).toBe("true");
  });

  test("grants local network access when the preflight asks for it", async () => {
    const response = await preflight({ "access-control-request-local-network": "true" });
    expect(response.headers.get("access-control-allow-local-network")).toBe("true");
  });

  test("does not grant private network access when it is not requested", async () => {
    const response = await preflight({});
    expect(response.headers.get("access-control-allow-private-network")).toBeNull();
    expect(response.headers.get("access-control-allow-local-network")).toBeNull();
  });
});
