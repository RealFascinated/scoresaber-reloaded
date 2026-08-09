import { afterAll, describe, expect, test } from "bun:test";
import type { Server } from "elysia/universal/server";
import { WebsocketManager } from "../../src/websocket/websocket-manager";
import { createTestApp } from "../helpers/create-test-app";

describe("GET /ws/score websocket", () => {
  const app = createTestApp();
  let server: Server | undefined;

  afterAll(async () => {
    await app.stop();
  });

  test("accepts connections and broadcasts published scores to connected clients", async () => {
    server = await new Promise<Server>(resolve => {
      app.listen(0, listeningServer => resolve(listeningServer));
    });

    const ws = new WebSocket(`ws://localhost:${server.port}/ws/score`);
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Failed to connect to /ws/score"));
    });

    const scoreWebsocket = WebsocketManager.get("score");
    expect(scoreWebsocket).toBeDefined();
    expect(scoreWebsocket!.getConnectedClientsAmount()).toBe(1);

    const payload = { scoreId: 123, playerId: "76561198000000000", score: 1000 };
    const received = new Promise<string>(resolve => {
      ws.onmessage = event => resolve(String(event.data));
    });
    scoreWebsocket!.publish(payload);

    const message = await received;
    expect(JSON.parse(message)).toEqual(payload);

    ws.close();
    await new Promise<void>(resolve => {
      ws.onclose = () => resolve();
    });

    // The server-side close handler may run a tick after the client observes the close.
    const deadline = Date.now() + 1000;
    while (scoreWebsocket!.getConnectedClientsAmount() !== 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(scoreWebsocket!.getConnectedClientsAmount()).toBe(0);
  });
});
