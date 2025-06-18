import SimpleTooltip from "@/components/simple-tooltip";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";

export function ScoreSaberScoreHMD({
  score,
  children,
}: {
  score: ScoreSaberScore;
  children: React.ReactNode;
}) {
  return (
    <SimpleTooltip
      display={
        <div className="flex flex-col gap-2">
          {score.hmd ? (
            <p>
              Score was set on <span className="font-semibold">{score.hmd}</span>
            </p>
          ) : (
            <p>An unknown HMD was used (mod did not submit hmd data)</p>
          )}

          {score.controllers && (
            <div>
              <p className="font-semibold">Controllers</p>
              <div>
                <p>Left: {score.controllers.leftController}</p>
                <p>Right: {score.controllers.rightController}</p>
              </div>
            </div>
          )}
        </div>
      }
      showOnMobile
    >
      {children}
    </SimpleTooltip>
  );
}
