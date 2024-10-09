"use client";

import { useQuery } from "@tanstack/react-query";
import ky from "ky";
import { config } from "../../../config";
import Tooltip from "@/components/tooltip";
import { InformationCircleIcon } from "@heroicons/react/16/solid";
import { formatNumberWithCommas } from "@/common/number-utils";
import { PlayerTrackedSince } from "@ssr/common/types/player/player-tracked-since";
import ScoreSaberPlayer from "@ssr/common/types/player/impl/scoresaber-player";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerTrackedStatus({ player }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["playerIsBeingTracked", player.id],
    queryFn: () => ky.get<PlayerTrackedSince>(`${config.siteApi}/player/tracked/${player.id}`).json(),
  });

  if (isLoading || isError || !data?.tracked) {
    return undefined;
  }

  return (
    <div className="flex gap-2">
      <Tooltip
        display={
          <div className="flex flex-col justify-center items-center">
            <p>This player is having their statistics tracked!</p>
            <p>Days Tracked: {formatNumberWithCommas(data.daysTracked!)}</p>
          </div>
        }
        side="bottom"
      >
        <InformationCircleIcon className="w-6 h-6 text-neutral-200" />
      </Tooltip>
    </div>
  );
}
