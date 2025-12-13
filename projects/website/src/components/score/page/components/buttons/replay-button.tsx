"use client";

import { Button } from "@/components/ui/button";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";
import { getBeatLeaderReplayRedirectUrl } from "@ssr/common/utils/beatleader-utils";
import Link from "next/link";

export default function ReplayButton({ additionalData }: { additionalData?: AdditionalScoreData }) {
  const database = useDatabase();
  const viewer = useStableLiveQuery(async () => database.getReplayViewer());

  if (!viewer) {
    return null;
  }

  if (!additionalData) {
    return null;
  }

  return (
    <Link
      href={viewer.generateUrl(
        additionalData.scoreId,
        getBeatLeaderReplayRedirectUrl(additionalData)
      )}
      data-umami-event="score-replay-button"
    >
      <Button>View Replay</Button>
    </Link>
  );
}
