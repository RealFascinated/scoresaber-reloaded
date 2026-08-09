import { afterAll, beforeAll, beforeEach } from "bun:test";
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
import { patchScoreSaberApiForTests } from "./helpers/scoresaber-api-test-patches";

let infraReady = false;

function ensureInfra(): void {
  if (infraReady) {
    return;
  }

  patchScoreSaberApiForTests();
  new MetricsService();
  new QueueManager();
  new StorageService();
  infraReady = true;
}

beforeAll(async () => {
  ensureInfra();
  await acquireTestSuiteLock();
  await ensureTestMigrations();
});

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  for (const queue of QueueManager.getQueues()) {
    queue.stop();
  }

  MetricsService.cleanup();
  await releaseTestSuiteLock();
});
