import HMDIcon from "@/components/hmd-icon";
import SimpleTooltip from "@/components/simple-tooltip";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";

export function ScoreSaberScoreHMD({
  score,
  children,
}: {
  score: ScoreSaberScore;
  children?: React.ReactNode;
}) {
  return (
    <SimpleTooltip
      display={
        <div className="flex flex-col gap-2">
          {score.hmd !== "Unknown" && score.hmd !== undefined ? (
            <div className="flex items-center gap-2">
              Score was set using a <HMDIcon hmd={getHMDInfo(score.hmd as HMD)} />{" "}
              <span className="font-semibold">{score.hmd}</span>
            </div>
          ) : (
            <div>
              <p>An unknown HMD was used (outdated mod?)</p>
              {score.leftController === "Touch" && <p>Likely a Quest variant was used</p>}
            </div>
          )}

          {score.leftController && score.rightController && (
            <div>
              <p className="font-semibold">Controllers</p>
              <div>
                <p>Left: {score.leftController}</p>
                <p>Right: {score.rightController}</p>
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
