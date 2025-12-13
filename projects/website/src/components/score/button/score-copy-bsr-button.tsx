"use client";

import { copyToClipboard } from "@/common/browser-utils";
import ScoreButton from "@/components/score/button/score-button";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { toast } from "sonner";

type ScoreBsrButtonProps = {
  beatSaverMap: BeatSaverMapResponse;
};

export function ScoreCopyBsrButton({ beatSaverMap }: ScoreBsrButtonProps) {
  return (
    <ScoreButton
      onClick={() => {
        toast.success(`Copied "!bsr ${beatSaverMap.bsr}" to your clipboard!`);
        copyToClipboard(`!bsr ${beatSaverMap.bsr}`);
      }}
      tooltip={<p>Click to copy the bsr code</p>}
    >
      <p>!</p>
    </ScoreButton>
  );
}
