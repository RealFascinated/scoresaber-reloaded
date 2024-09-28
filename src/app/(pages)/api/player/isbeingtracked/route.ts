import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/common/mongo";
import { IPlayer, PlayerModel } from "@/common/schema/player-schema";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (id == null) {
    return NextResponse.json(
      { error: "Unknown player. Missing: ?id=" },
      { status: 400 },
    );
  }
  await connectMongo(); // Connect to Mongo

  const foundPlayer: IPlayer | null = await PlayerModel.findById(id);
  const response: { tracked: boolean; lastTracked?: string } = {
    tracked: foundPlayer != null,
  };
  if (foundPlayer != null) {
    response["lastTracked"] = foundPlayer.trackedSince?.toUTCString();
  }
  return NextResponse.json(response);
}
