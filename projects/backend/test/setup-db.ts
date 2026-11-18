import { afterAll, afterEach, beforeAll, beforeEach } from "bun:test";
import { QueueManager } from "../src/queue/queue-manager";
import MetricsService from "../src/service/infra/metrics.service";
import StorageService from "../src/service/infra/storage.service";
import "./env";
import {
  acquireTestSuiteLock,
  ensureTestMigrations,
  releaseTestSuiteLock,
  resetTestDatabase,
} from "./helpers/database";
import { server, startMockServer } from "./helpers/msw-server";

let infraReady = false;

function ensureInfra() {
  if (infraReady) {
    return;
  }

  startMockServer();
  new MetricsService();
  new QueueManager();
  new StorageService();
  infraReady = true;
}

beforeAll(async () => {
  await acquireTestSuiteLock();
  await ensureTestMigrations();
  ensureInfra();
});

beforeEach(async () => {
  await resetTestDatabase();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(async () => {
  for (const queue of QueueManager.getQueues()) {
    queue.stop();
  }

  MetricsService.cleanup();
  await releaseTestSuiteLock();
});
