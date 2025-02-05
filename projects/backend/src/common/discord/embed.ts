import { EmbedBuilder } from "discord.js";

/**
 * Creates a generic embed.
 *
 * @param title the title of the embed
 * @param description the description of the embed
 * @param type the type of the embed
 * @returns the embed
 */
export function createGenericEmbed(
  title: string,
  description: string,
  type: "success" | "error" = "success"
) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(type === "success" ? "#00ff00" : "#ff0000");
}
