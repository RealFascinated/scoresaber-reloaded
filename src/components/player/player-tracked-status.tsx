"use client";

import { useQuery } from "@tanstack/react-query";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import ky from "ky";
import { config } from "../../../config";
import Tooltip from "@/components/tooltip";
import { InformationCircleIcon } from "@heroicons/react/16/solid";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerTrackedStatus({ player }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["playerIsBeingTracked", player.id],
    queryFn: () =>
      ky
        .get<{
          tracked: boolean;
        }>(`${config.siteUrl}/api/player/isbeingtracked?id=${player.id}`)
        .json(),
  });

  if (isLoading || isError || !data?.tracked) {
    return undefined;
  }

  return (
    <div className="flex gap-2">
      <Tooltip
        display={<p>This player is having their statistics tracked!</p>}
        side="bottom"
      >
        <InformationCircleIcon className="w-6 h-6 text-neutral-200" />
      </Tooltip>
    </div>
  );
}
