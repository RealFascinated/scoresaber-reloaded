"use client";

import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { getBeatLeaderReplayRedirectUrl } from "@ssr/common/utils/beatleader-utils";

export default function ReplayButton({ score }: { score: ScoreSaberScore }) {
  const database = useDatabase();
  const viewer = useStableLiveQuery(async () => database.getReplayViewer());

  if (!viewer || !score.beatLeaderScore) {
    return null;
  }

  return (
    <SimpleLink
      href={viewer.generateUrl(
        score.beatLeaderScore?.scoreId,
        getBeatLeaderReplayRedirectUrl(score)
      )}
    >
      <Button>View Replay</Button>
    </SimpleLink>
  );
}
