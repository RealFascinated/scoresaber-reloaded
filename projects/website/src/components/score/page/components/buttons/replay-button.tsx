"use client";

import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";
import { getBeatLeaderReplayRedirectUrl } from "@ssr/common/utils/beatleader-utils";

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
    <SimpleLink href={viewer.generateUrl(additionalData.scoreId, getBeatLeaderReplayRedirectUrl(additionalData))}>
      <Button>View Replay</Button>
    </SimpleLink>
  );
}
