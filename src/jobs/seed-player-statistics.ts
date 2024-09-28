import { cronTrigger } from "@trigger.dev/sdk";
import { client } from "@/trigger";
import { connectMongo } from "@/common/mongo";
import { getMidnightAlignedDate } from "@/common/time-utils";
import { IPlayer, PlayerModel } from "@/common/schema/player-schema";
import { trackScoreSaberPlayer } from "@/common/player-utils";

client.defineJob({
  id: "track-player-statistics",
  name: "Tracks player statistics",
  version: "0.0.1",
  trigger: cronTrigger({
    // Run at 00:01 every day (midnight)
    cron: "0 1 * * *",
  }),
  run: async (payload, io, ctx) => {
    await io.logger.info("Connecting to Mongo");
    await connectMongo();

    await io.logger.info("Finding players...");
    const players: IPlayer[] = await PlayerModel.find({});
    await io.logger.info(
      `Found ${players.length} player${players.length > 1 ? "s" : ""}.`,
    );

    const dateToday = getMidnightAlignedDate(new Date());
    for (const foundPlayer of players) {
      await io.runTask(`track-player-${foundPlayer.id}`, async () => {
        await trackScoreSaberPlayer(dateToday, foundPlayer, io);
      });
    }
  },
});
