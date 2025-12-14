import Logger from "@ssr/common/logger";
import { EmbedBuilder } from "discord.js";
import mongoose from "mongoose";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";

Logger.info("Initialized mongoose slow query plugin :D");
mongoose.plugin((schema: mongoose.Schema) => {
  // Store start time and query info before execution
  const queryTimings = new WeakMap<
    mongoose.Query<unknown, unknown>,
    { start: number; collectionName: string; operation: string; query: unknown }
  >();

  schema.pre(/^(find|count|distinct|aggregate)/, function (this: mongoose.Query<unknown, unknown>) {
    const collectionName = (schema as { collection?: { name?: string } }).collection?.name || "unknown";
    const operation = (this as { op?: string }).op || "unknown";
    const queryObj = this.getQuery ? this.getQuery() : this.getFilter ? this.getFilter() : {};

    queryTimings.set(this, {
      start: Date.now(),
      collectionName,
      operation,
      query: queryObj,
    });
  });

  schema.post(/^(find|count|distinct|aggregate)/, function (this: mongoose.Query<unknown, unknown>) {
    const timing = queryTimings.get(this);
    if (!timing) {
      return;
    }

    const milliseconds = Date.now() - timing.start;
    if (milliseconds > 50) {
      const queryString = JSON.stringify(timing.query, null, 2);
      Logger.warn(
        `Slow query detected: ${timing.collectionName}.${timing.operation} took ${milliseconds}ms`,
        queryString
      );

      sendEmbedToChannel(
        DiscordChannels.BACKEND_LOGS,
        new EmbedBuilder()
          .setTitle("🐌 Slow Query Detected")
          .setDescription(`**${timing.collectionName}.${timing.operation}** took **${milliseconds}ms**`)
          .addFields({
            name: "Query",
            value: `\`\`\`json\n${queryString.length > 1000 ? queryString.substring(0, 1000) + "..." : queryString}\n\`\`\``,
          })
          .setColor(0xffaa00)
          .setTimestamp()
      ).catch(error => {
        Logger.error("Failed to send slow query to Discord:", error);
      });
    }

    queryTimings.delete(this);
  });
});
    