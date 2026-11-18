import { ws } from "msw";
import { setupServer } from "msw/node";
import { accSaberApiHandlers } from "./accsaber-api.test-utils";
import { beatLeaderApiHandlers } from "./beatleader-api.test-utils";
import { beatSaverApiHandlers } from "./beatsaver-api.test-utils";
import { scoreSaberApiHandlers } from "./scoresaber-api.test-utils";

const localWebsocket = ws.link(/^ws:\/\/localhost(:\d+)?\//u);

/**
 * The single MSW server every integration test shares. Tests add per-test responses with
 * `server.use(...)`; they are dropped again after each test.
 */
export const server = setupServer(
  ...scoreSaberApiHandlers,
  ...beatLeaderApiHandlers,
  ...beatSaverApiHandlers,
  ...accSaberApiHandlers,
  localWebsocket.addEventListener("connection", ({ server: upstream }) => {
    upstream.connect();
  })
);

let listening = false;

/** Starts intercepting outbound HTTP. A request no handler covers fails the test instead of reaching the network. */
export function startMockServer() {
  if (listening) {
    return;
  }

  server.listen({ onUnhandledRequest: "error" });
  listening = true;
}
