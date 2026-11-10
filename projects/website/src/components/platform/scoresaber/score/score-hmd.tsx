import SimpleTooltip from "@/components/simple-tooltip";
import { SharedIcons } from "@/shared-icons";
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
              Score was set using a{" "}
              <span className="flex items-center">
                <SharedIcons.HeadMountedDisplayIcon hmd={getHMDInfo(score.hmd as HMD)} />
              </span>{" "}
              <span className="font-semibold">{score.hmd}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Headset not recognized</p>
              <p className="text-muted-foreground">
                Recorded with an unrecognized headset, usually an outdated mod version or a newly released
                headset. Updating the mod may resolve this.
              </p>
              {score.leftController === "Touch" && (
                <p className="text-muted-foreground">Likely recorded on a Meta Quest.</p>
              )}
            </div>
          )}

          {score.leftController && score.rightController && (
            <div>
              <p className="font-semibold">Controllers</p>
              <div>
                <p>Left: {score.leftController === "Unknown" ? "Not recorded" : score.leftController}</p>
                <p>Right: {score.rightController === "Unknown" ? "Not recorded" : score.rightController}</p>
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
