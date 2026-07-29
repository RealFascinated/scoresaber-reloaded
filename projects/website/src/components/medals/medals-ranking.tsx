"use client";

import { PlayerAvatar } from "@/components/ranking/player-avatar";
import SimpleLink from "@/components/simple-link";
import type { MedalRankingPlayer } from "@ssr/common/schemas/response/ranking/medal-rankings";

export function MedalsRanking({
  player,
}: {
  player: MedalRankingPlayer;
}) {
  return (
    <SimpleLink href={`/player/${player.id}`} className="flex items-center gap-2.5">
      <PlayerAvatar profilePicture={player.avatar} name={player.name} />
      <span className="text-sm font-medium leading-tight">{player.name}</span>
    </SimpleLink>
  );
}
