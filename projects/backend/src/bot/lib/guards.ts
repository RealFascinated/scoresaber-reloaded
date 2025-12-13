import { IsGuardUserCallback } from "@discordx/utilities";
import { CommandInteraction, MessageFlags } from "discord.js";

export const OwnerOnly: IsGuardUserCallback = ({ user, arg }) => {
  if (!user) {
    return false;
  }

  const isOwner = user.id === "474221560031608833";
  if (arg instanceof CommandInteraction && !isOwner) {
    arg.reply({
      content: "You are not authorized to use this command. Only the bot owner can use this command.",
      flags: [MessageFlags.Ephemeral],
    });
    return false;
  }

  return isOwner;
};
