import { DiscordUserDocument, DiscordUserModel } from "../model/discord-user";

/**
 * Gets the user for a discord id.
 *
 * @param id the discord id
 * @returns the user
 */
export async function getDiscordUser(id: string): Promise<DiscordUserDocument> {
  const user = await DiscordUserModel.findOne({ _id: id });
  if (user == undefined) {
    return await DiscordUserModel.create({ _id: id });
  }
  return user;
}
