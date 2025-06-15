import BeatSaverLogo from "@/components/logos/beatsaver-logo";
import ScoreButton from "@/components/score/button/score-button";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import Link from "next/link";

type BeatSaverMapProps = {
  beatSaverMap: BeatSaverMapResponse;
};

export function BeatSaverMapButton({ beatSaverMap }: BeatSaverMapProps) {
  const url = `https://beatsaver.com/maps/${beatSaverMap.bsr}`;

  return (
    <Link href={url} target="_blank">
      <ScoreButton tooltip={<p>Click to open the map</p>}>
        <BeatSaverLogo />
      </ScoreButton>
    </Link>
  );
}
