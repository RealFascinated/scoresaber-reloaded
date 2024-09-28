import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/common/mongo";
import { IPlayer, PlayerModel } from "@/common/schema/player-schema";
import { PlayerHistory } from "@/common/player/player-history";
import { seedPlayerHistory, sortPlayerHistory } from "@/common/player-utils";
import { scoresaberService } from "@/common/service/impl/scoresaber";

export async function GET(request: NextRequest) {
  const playerIdCookie = request.cookies.get("playerId");
  const id = request.nextUrl.searchParams.get("id");
  if (id == null) {
    return NextResponse.json(
      { error: "Unknown player. Missing: ?id=" },
      { status: 400 },
    );
  }
  const shouldCreatePlayer = playerIdCookie?.value === id;

  await connectMongo(); // Connect to Mongo

  // Fetch the player and return their statistic history
  let foundPlayer: IPlayer | null = await PlayerModel.findById(id);
  if (shouldCreatePlayer && foundPlayer == null) {
    foundPlayer = await PlayerModel.create({
      _id: id,
    });
    const response = await scoresaberService.lookupPlayer(id, true);
    if (response != undefined) {
      const { player, rawPlayer } = response;
      await seedPlayerHistory(foundPlayer!, player, rawPlayer);
    }
  }
  if (foundPlayer == null) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  let history: Map<string, PlayerHistory> = foundPlayer.getStatisticHistory();
  let fetchedHistory = sortPlayerHistory(history);
  fetchedHistory = fetchedHistory.slice(-50); // Get the last 50 entries
  const resultHistory: { [key: string]: PlayerHistory } = {};
  for (const [date, history] of fetchedHistory) {
    resultHistory[date] = history;
  }
  return NextResponse.json(resultHistory);
}
