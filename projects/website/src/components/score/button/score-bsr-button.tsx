"use client";

import { copyToClipboard } from "@/common/browser-utils";
import ScoreButton from "@/components/score/button/score-button";
import * as React from "react";
import { toast } from "@/hooks/use-toast";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";

type ScoreBsrButtonProps = {
  beatSaverMap: BeatSaverMapResponse;
};

export function ScoreBsrButton({ beatSaverMap }: ScoreBsrButtonProps) {
  return (
    <ScoreButton
      onClick={() => {
        toast({
          title: "Copied!",
          description: `Copied "!bsr ${beatSaverMap.bsr}" to your clipboard!`,
        });
        copyToClipboard(`!bsr ${beatSaverMap.bsr}`);
      }}
      tooltip={<p>Click to copy the bsr code</p>}
    >
      <p>!</p>
    </ScoreButton>
  );
}
