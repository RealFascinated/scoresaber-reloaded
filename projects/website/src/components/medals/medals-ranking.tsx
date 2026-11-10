"use client";

import { PlayerAvatar } from "@/components/ranking/player-avatar";
import SimpleLink from "@/components/simple-link";
import type { MedalRankingPlayer } from "@ssr/common/schemas/response/ranking/medal-rankings";

export function MedalsRanking({
  player,
  deferAvatar = false,
}: {
  player: MedalRankingPlayer;
  deferAvatar?: boolean;
}) {
  return (
    <SimpleLink
      href={`/player/${player.id}`}
      className="flex items-center gap-2.5 after:absolute after:inset-0"
    >
      <PlayerAvatar profilePicture={player.avatar} name={player.name} deferred={deferAvatar} />
      <span className="text-sm leading-tight font-medium">{player.name}</span>
    </SimpleLink>
  );
}
