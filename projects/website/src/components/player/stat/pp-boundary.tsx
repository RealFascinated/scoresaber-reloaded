"use client";

import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPlayerPpBoundary } from "@ssr/common/utils/player-utils";
import StatValue from "@/components/stat-value";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Tooltip from "@/components/tooltip";

type PpBoundaryProps = {
  player: ScoreSaberPlayer;
};

export default function PpBoundaryStat({ player }: PpBoundaryProps) {
  const [boundary, setBoundary] = useState<number>(1);
  const [boundaries, setBoundaries] = useState<number[]>();
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["playerPpBoundary", player.id],
    queryFn: async () => (await getPlayerPpBoundary(player.id, 50))?.boundaries || [-1],
  });

  const handlePopoverState = (state: boolean) => {
    setIsPopoverOpen(state);

    if (!state) {
      setBoundary(1);
    }
  };

  useEffect(() => {
    if (data) {
      setBoundaries(data);
    }
  }, [data]);

  if (((isLoading || isError) && !isPopoverOpen) || !boundaries || boundaries[0] == -1) {
    return null;
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={handlePopoverState}>
      <PopoverTrigger asChild>
        <div onClick={() => setIsPopoverOpen(true)}>
          <Tooltip
            asChild={false}
            display={
              <p className="text-center">Amount of raw pp required to increase your global pp by {boundary}pp</p>
            }
          >
            <StatValue name={`+${boundary} PP`} value={<p>{boundaries[boundary - 1].toFixed(2) || "-"}pp</p>} />
          </Tooltip>
        </div>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-2 p-3">
        <p className="text-sm">Change the pp boundary.</p>
        <Slider
          min={1}
          max={50}
          value={[boundary]}
          onValueChange={([value]) => setBoundary(value)}
          onPointerDown={() => setIsPopoverOpen(true)} // Keep open while interacting with the slider
        />
      </PopoverContent>
    </Popover>
  );
}
