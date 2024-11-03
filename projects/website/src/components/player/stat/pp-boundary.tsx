"use client";

import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPlayerPpBoundary } from "@ssr/common/utils/player-utils";
import StatValue from "@/components/stat-value";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type PpBoundaryProps = {
  player: ScoreSaberPlayer;
};

export default function PpBoundaryStat({ player }: PpBoundaryProps) {
  const [boundary, setBoundary] = useState(1);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false); // Track popover state

  const { data, isLoading, isError } = useQuery({
    queryKey: ["playerPpBoundary", player.id, boundary],
    queryFn: async () => (await getPlayerPpBoundary(player.id, boundary))?.rawPp || -1,
  });

  if ((isLoading || isError || data === -1) && !isPopoverOpen) {
    return null;
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger onClick={() => setIsPopoverOpen(true)}>
        <StatValue name={`+${boundary} PP`} value={<p>{data?.toFixed(2) || "-"}pp</p>} />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-2 p-3">
        <p className="text-sm">Change the pp boundary.</p>
        <Slider
          min={1}
          max={25}
          value={[boundary]}
          onValueChange={([value]) => setBoundary(value)}
          onPointerDown={() => setIsPopoverOpen(true)} // Keep open while interacting with the slider
        />
      </PopoverContent>
    </Popover>
  );
}
