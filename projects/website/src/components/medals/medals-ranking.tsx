"use client";

import { PlayerRanking } from "@/components/player/player-ranking";
import type { MedalRankingPlayer } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { Medal } from "lucide-react";

export function MedalsRanking({
  player,
  firstColumnWidth,
  showAccountInactive = false,
}: {
  player: MedalRankingPlayer;
  firstColumnWidth: number;
  showAccountInactive?: boolean;
}) {
  return (
    <PlayerRanking<MedalRankingPlayer>
      player={player}
      getRank={p => p.medalsRank}
      getCountryRank={p => p.medalsCountryRank}
      firstColumnWidth={firstColumnWidth}
      showAccountInactive={showAccountInactive}
      worth={
        <div className="ml-auto flex min-w-[70px] flex-row items-center justify-end gap-2">
          <Medal className="size-4" />
          <p className="text-pp font-semibold">{formatNumberWithCommas(player.medals)}</p>
        </div>
      }
    />
  );
}
