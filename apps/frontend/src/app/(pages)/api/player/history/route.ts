import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/common/mongo";
import { IPlayer, PlayerModel } from "@/common/schema/player-schema";
import { seedPlayerHistory } from "@/common/player-utils";
import { scoresaberService } from "@/common/service/impl/scoresaber";

export async function GET(request: NextRequest) {
  const playerIdCookie = request.cookies.get("playerId");
  const id = request.nextUrl.searchParams.get("id");
  if (id == null) {
    return NextResponse.json({ error: "Unknown player. Missing: ?id=" }, { status: 400 });
  }
  const shouldCreatePlayer = playerIdCookie?.value === id;

  await connectMongo(); // Connect to Mongo

  // Fetch the player and return their statistic history
  let foundPlayer: IPlayer | null = await PlayerModel.findById(id);
  if (shouldCreatePlayer && foundPlayer == null) {
    foundPlayer = await PlayerModel.create({
      _id: id,
      trackedSince: new Date().toISOString(),
    });
    const response = await scoresaberService.lookupPlayer(id);
    if (response != undefined) {
      const { player, rawPlayer } = response;
      await seedPlayerHistory(foundPlayer!, player, rawPlayer);
    }
  }
  if (foundPlayer == null) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json(foundPlayer.getHistoryPrevious(50));
}
