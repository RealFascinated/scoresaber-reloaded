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
          {score.hmd !== "Unknown" ? (
            <p>
              Score was set on <span className="font-semibold">{score.hmd}</span>
            </p>
          ) : (
            <div>
              <p>An unknown HMD was used (outdated mod?)</p>
              {score.controllers?.leftController === "Touch" && (
                <p>Likely a Quest variant was used</p>
              )}
            </div>
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
