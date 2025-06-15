"use client";

import SimpleTooltip from "@/components/simple-tooltip";
import { InformationCircleIcon } from "@heroicons/react/16/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerTrackedStatus({ player }: Props) {
  return (
    <div className="flex gap-2">
      <SimpleTooltip
        display={
          <div className="flex flex-col text-center">
            <p>This player has been tracked since </p>
            <p>
              {formatDate(player.trackedSince, "Do MMMM, YYYY HH:mm a")} (
              {timeAgo(player.trackedSince)})
            </p>
          </div>
        }
        showOnMobile
      >
        <InformationCircleIcon className="w-[22px] h-[22px] text-neutral-200" />
      </SimpleTooltip>
    </div>
  );
}
