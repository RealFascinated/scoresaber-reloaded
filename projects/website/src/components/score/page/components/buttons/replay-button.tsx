"use client";

import { cn } from "@/common/utils";
import SimpleLink from "@/components/simple-link";
import { Button, type ButtonProps } from "@/components/ui/button";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { getBeatLeaderReplayRedirectUrl } from "@ssr/common/utils/beatleader-utils";
import { PlayCircle } from "lucide-react";

type ReplayButtonProps = {
  score: ScoreSaberScore;
} & Omit<ButtonProps, "asChild" | "children">;

export default function ReplayButton({
  score,
  variant = "outline",
  size = "sm",
  className,
  ...buttonProps
}: ReplayButtonProps) {
  const database = useDatabase();
  const viewer = useStableLiveQuery(async () => database.getReplayViewer());

  if (!viewer || !score.beatLeaderScore) {
    return null;
  }

  return (
    <SimpleLink
      className="inline-flex"
      href={viewer.generateUrl(score.beatLeaderScore?.scoreId, getBeatLeaderReplayRedirectUrl(score))}
    >
      <Button variant={variant} size={size} className={cn("gap-1.5 font-medium", className)} {...buttonProps}>
        <PlayCircle className="size-3.5 shrink-0 opacity-90" aria-hidden />
        Replay
      </Button>
    </SimpleLink>
  );
}
