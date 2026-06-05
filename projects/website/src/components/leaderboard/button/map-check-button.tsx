import ScoreButton from "@/components/score/button/score-button";
import { SharedIcons } from "@/shared-icons";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";

type MapCheckButtonProps = {
  beatSaverMap: BeatSaverMap;
};

export function MapCheckButton({ beatSaverMap }: MapCheckButtonProps) {
  return (
    <ScoreButton
      href={`https://kivalevan.me/BeatSaber-MapCheck/?id=${beatSaverMap.bsr}`}
      tooltip={<p>Click to check the map</p>}
    >
      <SharedIcons.MapCheckIcon className="h-5 w-5" />
    </ScoreButton>
  );
}
