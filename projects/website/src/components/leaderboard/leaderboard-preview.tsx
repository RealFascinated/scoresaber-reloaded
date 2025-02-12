"use client";

import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { useDebounce } from "@uidotdev/usehooks";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { LeaderboardInfo } from "./page/leaderboard-info";

type LeaderboardPreviewProps = {
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  children: React.ReactNode;
};

export default function LeaderboardPreview({
  leaderboard,
  beatSaverMap,
  children,
}: LeaderboardPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const state = useDebounce(isOpen, 100);

  return (
    <Popover open={state} onOpenChange={setIsOpen}>
      <PopoverTrigger
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="flex w-fit"
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <LeaderboardInfo leaderboard={leaderboard} beatSaverMap={beatSaverMap} />
      </PopoverContent>
    </Popover>
  );
}
