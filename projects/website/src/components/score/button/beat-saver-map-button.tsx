import BeatSaverLogo from "@/components/logos/beatsaver-logo";
import ScoreButton from "@/components/score/button/score-button";
import SimpleLink from "@/components/simple-link";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";

type BeatSaverMapProps = {
  beatSaverMap: BeatSaverMapResponse;
};

export function BeatSaverMapButton({ beatSaverMap }: BeatSaverMapProps) {
  const url = `https://beatsaver.com/maps/${beatSaverMap.bsr}`;

  return (
    <SimpleLink href={url} target="_blank">
      <ScoreButton tooltip={<p>Click to open the map</p>}>
        <BeatSaverLogo />
      </ScoreButton>
    </SimpleLink>
  );
}
