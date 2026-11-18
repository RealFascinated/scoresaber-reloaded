import { afterAll, describe, expect, test } from "bun:test";
import type { Server } from "elysia";
import { createTestApp, nextWebsocketEvent } from "../../test/helpers/create-test-app";
import { WebsocketManager } from "./websocket-manager";

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

    const scoreWebsocket = WebsocketManager.get("score");
    expect(scoreWebsocket).toBeDefined();
    const serverOpened = nextWebsocketEvent("open", scoreWebsocket!.route);

    const ws = new WebSocket(`ws://localhost:${server.port}/ws/score`);
    const clientOpened = new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Failed to connect to /ws/score"));
    });
    await Promise.all([clientOpened, serverOpened]);

    expect(scoreWebsocket!.getConnectedClientsAmount()).toBe(1);

    const payload = { scoreId: 123, playerId: "76561198000000000", score: 1000 };
    const received = new Promise<string>(resolve => {
      ws.onmessage = event => resolve(String(event.data));
    });
    scoreWebsocket!.publish(payload);

    const message = await received;
    expect(JSON.parse(message)).toEqual(payload);

    const serverClosed = nextWebsocketEvent("close", scoreWebsocket!.route);
    const clientClosed = new Promise<void>(resolve => {
      ws.onclose = () => resolve();
    });
    ws.close();
    await Promise.all([clientClosed, serverClosed]);

    expect(scoreWebsocket!.getConnectedClientsAmount()).toBe(0);
  });
});
