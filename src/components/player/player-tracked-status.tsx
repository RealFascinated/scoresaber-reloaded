"use client";

import { useQuery } from "@tanstack/react-query";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import ky from "ky";
import { config } from "../../../config";
import Tooltip from "@/components/tooltip";
import { InformationCircleIcon } from "@heroicons/react/16/solid";
import { format } from "@formkit/tempo";
import { PlayerTrackedSince } from "@/common/player/player-tracked-since";
import { getDaysAgo } from "@/common/time-utils";
import { formatNumberWithCommas } from "@/common/number-utils";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerTrackedStatus({ player }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["playerIsBeingTracked", player.id],
    queryFn: () =>
      ky
        .get<PlayerTrackedSince>(
          `${config.siteUrl}/api/player/isbeingtracked?id=${player.id}`,
        )
        .json(),
  });

  if (isLoading || isError || !data?.tracked) {
    return undefined;
  }

  const trackedSince = new Date(data.trackedSince!);
  const daysAgo = getDaysAgo(trackedSince) + 1;
  let daysAgoFormatted = `${formatNumberWithCommas(daysAgo)} day${daysAgo > 1 ? "s" : ""} ago`;
  if (daysAgo === 1) {
    daysAgoFormatted = "Today";
  }
  if (daysAgo === 2) {
    daysAgoFormatted = "Yesterday";
  }

  return (
    <div className="flex gap-2">
      <Tooltip
        display={
          <div className="flex flex-col justify-center items-center">
            <p>This player is having their statistics tracked!</p>
            <p>
              Tracked Since: {format(trackedSince)} ({daysAgoFormatted})
            </p>
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
