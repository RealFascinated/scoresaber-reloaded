"use client";

import { useQuery } from "@tanstack/react-query";
import ky from "ky";
import Tooltip from "@/components/tooltip";
import { InformationCircleIcon } from "@heroicons/react/16/solid";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { PlayerTrackedSince } from "@ssr/common/player/player-tracked-since";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { Config } from "@ssr/common/config";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerTrackedStatus({ player }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["playerIsBeingTracked", player.id],
    queryFn: () => ky.get<PlayerTrackedSince>(`${Config.apiUrl}/player/tracked/${player.id}`).json(),
  });

  if (isLoading || isError || !data?.tracked) {
    return undefined;
  }

  return (
    <div className="flex gap-2">
      <Tooltip
        display={
          <div className="flex flex-col">
            <p>This player is being tracked!</p>
            <p>Days Tracked: {formatNumberWithCommas(data.daysTracked!)}</p>
          </div>
        }
        side="bottom"
      >
        <InformationCircleIcon className="w-[22px] h-[22px] text-neutral-200" />
      </Tooltip>
    </div>
  );
}
