import ScoreButton from "@/components/score/button/score-button";
import { HandIcon } from "@radix-ui/react-icons";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";

type OneClickInstallButtonProps = {
  beatSaverMap: BeatSaverMap;
};

export function OneClickInstallButton({ beatSaverMap }: OneClickInstallButtonProps) {
  return (
    <ScoreButton href={`beatsaver://${beatSaverMap.bsr}`} tooltip={<p>Click to install the map</p>}>
      <HandIcon className="h-4 w-4" />
    </ScoreButton>
  );
}
