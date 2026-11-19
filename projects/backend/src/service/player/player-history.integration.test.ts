import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { HttpResponse } from "msw";
import { TEST_PLAYER_ID, TEST_PLAYER_TWO_ID } from "../../../test/helpers/constants";
import { server } from "../../../test/helpers/msw-server";
import { scoreSaberApi } from "../../../test/helpers/scoresaber-api.test-utils";
import { buildAccountRow, buildScoreSaberV2PlayerToken } from "../../../test/helpers/scoresaber.fixture";
import { db } from "../../db";
import { playerHistoryTable, scoreSaberAccountsTable } from "../../db/schema";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { PlayerHistoryService } from "./player-history.service";

const PAGE_SIZE = 50;
const EXTRA_PLAYER_COUNT = 260;

function extraPlayerId(index: number) {
  return `9${String(index).padStart(31, "0")}`;
}

function serveRanking(players: ReturnType<typeof buildScoreSaberV2PlayerToken>[]) {
  server.use(
    scoreSaberApi("/v2/players", ({ searchParams }) => {
      const page = Number(searchParams.get("page") ?? "1");
      return HttpResponse.json({
        data: players.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        metadata: {
          page,
          itemsPerPage: PAGE_SIZE,
          totalItems: players.length,
          totalPages: Math.ceil(players.length / PAGE_SIZE),
        },
      });
    })
  );
}

describe("PlayerHistoryService.updatePlayerStatistics", () => {
  test("tracks every ranked player across chunks and marks unlisted players inactive", async () => {
    await db
      .insert(scoreSaberAccountsTable)
      .values(
        Array.from({ length: EXTRA_PLAYER_COUNT }, (_, index) =>
          buildAccountRow({ id: extraPlayerId(index), name: `Extra${index}` })
        )
      );
    const testPlayer = buildScoreSaberV2PlayerToken({
      name: "Renamed",
      stats: { ...buildScoreSaberV2PlayerToken().stats, rank: 42, totalPP: 321 },
    });
    serveRanking([
      testPlayer,
      ...Array.from({ length: EXTRA_PLAYER_COUNT }, (_, index) =>
        buildScoreSaberV2PlayerToken({ id: extraPlayerId(index), name: `Extra${index}` })
      ),
    ]);

    await PlayerHistoryService.updatePlayerStatistics();

    const today = getMidnightAlignedDate(new Date());
    const historyRows = await db
      .select()
      .from(playerHistoryTable)
      .where(and(eq(playerHistoryTable.date, today), eq(playerHistoryTable.realmId, DEFAULT_REALM_ID)));
    expect(historyRows).toHaveLength(EXTRA_PLAYER_COUNT + 1);

    const account = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
    const testPlayerHistory = historyRows.find(row => row.playerId === TEST_PLAYER_ID);
    const { statistics } = await ScoreSaberScoresRepository.getPlayerScoreStatistics(
      TEST_PLAYER_ID,
      DEFAULT_REALM_ID
    );
    expect(testPlayerHistory).toMatchObject({
      rank: 42,
      pp: 321,
      medals: account?.medals,
      totalScores: statistics.totalScores,
      totalRankedScores: statistics.totalRankedScores,
      totalScore: statistics.totalScore,
    });

    expect(account).toMatchObject({ name: "Renamed", peakRank: 42 });
    expect((await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_TWO_ID))?.inactive).toBe(true);
  });
});
