import ScoreButton from "@/components/score/button/score-button";
import { HandIcon } from "@radix-ui/react-icons";
import { BeatSaverMapResponse } from "@ssr/common/schemas/response/beatsaver/beatsaver-map";

type OneClickInstallButtonProps = {
  beatSaverMap: BeatSaverMapResponse;
};

export function OneClickInstallButton({ beatSaverMap }: OneClickInstallButtonProps) {
  return (
    <ScoreButton href={`beatsaver://${beatSaverMap.bsr}`} tooltip={<p>Click to install the map</p>}>
      <HandIcon className="h-4 w-4" />
    </ScoreButton>
  );
}
