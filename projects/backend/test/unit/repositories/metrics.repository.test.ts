import { describe, expect, test } from "bun:test";
import { MetricsRepository } from "../../../src/repositories/metrics.repository";

describe("MetricsRepository", () => {
  test("upsertMany and loadAll round-trip metric rows", async () => {
    await MetricsRepository.upsertMany([
      { id: "test.metric.a", value: { count: 1 } },
      { id: "test.metric.b", value: [1, 2, 3] },
    ]);

    const rows = await MetricsRepository.loadAll();
    const ids = rows.map(row => row.id);
    expect(ids).toContain("test.metric.a");
    expect(ids).toContain("test.metric.b");
  });
});
