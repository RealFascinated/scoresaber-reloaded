import ScoreButton from "@/components/score/button/score-button";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { DownloadIcon } from "lucide-react";

type OneClickInstallButtonProps = {
  beatSaverMap: BeatSaverMap;
};

export function OneClickInstallButton({ beatSaverMap }: OneClickInstallButtonProps) {
  return (
    <ScoreButton href={`beatsaver://${beatSaverMap.bsr}`} tooltip={<p>Click to install the map</p>}>
      <DownloadIcon className="size-4" />
    </ScoreButton>
  );
}
