"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SharedIcons } from "@/shared-icons";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";

const ALL_HMDS = "All Hmds";

export default function HmdFilter({
  player,
  hmdFilter,
  onHmdFilterChange,
}: {
  player: ScoreSaberPlayer;
  hmdFilter: HMD | null;
  onHmdFilterChange: (value: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Select value={hmdFilter || ALL_HMDS} onValueChange={onHmdFilterChange}>
        <SelectTrigger className="h-8 w-full text-xs sm:w-42">
          <SelectValue placeholder="HMD Filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_HMDS}>
            <div className="flex items-center gap-2">
              <SharedIcons.HeadMountedDisplayIcon hmd={getHMDInfo("Unknown")} />
              <span>All HMDs</span>
            </div>
          </SelectItem>
          {player.hmdBreakdown &&
            Object.keys(player.hmdBreakdown)
              .filter(filter => filter !== "Unknown")
              .map(filter => (
                <SelectItem key={filter} value={filter}>
                  <div className="flex items-center gap-2">
                    <SharedIcons.HeadMountedDisplayIcon hmd={getHMDInfo(filter as HMD)} />
                    <span>{filter}</span>
                  </div>
                </SelectItem>
              ))}
        </SelectContent>
      </Select>
    </div>
  );
}
