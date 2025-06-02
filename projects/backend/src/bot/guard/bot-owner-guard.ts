import { GuardFunction } from "discordx";

export const BotOwnerGuard: GuardFunction = async interaction => {
  if (interaction.user.id !== "474221560031608833") {
    throw new Error("You are not the bot owner");
  }
};
