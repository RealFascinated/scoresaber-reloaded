"use client";

import Tooltip from "@/components/tooltip";
import { InformationCircleIcon } from "@heroicons/react/16/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerTrackedStatus({ player }: Props) {
  if (!player.isBeingTracked) {
    return undefined;
  }

  return (
    <div className="flex gap-2">
      <Tooltip
        display={
          <div className="flex flex-col">
            <p>This player is being tracked!</p>
          </div>
        }
        side="bottom"
      >
        <InformationCircleIcon className="w-[22px] h-[22px] text-neutral-200" />
      </Tooltip>
    </div>
  );
}
