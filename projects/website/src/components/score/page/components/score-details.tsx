import HMDIcon from "@/components/hmd-icon";
import { PlayerAvatar } from "@/components/ranking/player-avatar";
import { getHMDInfo } from "@ssr/common/hmds";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlayerScore } from "@ssr/common/score/player-score";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import LeaderboardButton from "./buttons/leaderboard-button";
import PlayerButton from "./buttons/player-button";
import ReplayButton from "./buttons/replay-button";
import LeaderboardInfo from "./leaderboard-info";

export default function ScoreDetails({ score }: { score: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard> }) {
  const { leaderboard, beatSaver } = score;

  return (
    <div className="bg-secondary/90 border-border flex flex-col rounded-xl border p-0">
      <LeaderboardInfo leaderboard={leaderboard} beatSaver={beatSaver} />

      {/* Score Buttons */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
        <ReplayButton score={score.score} />
        <PlayerButton playerId={score.score.playerInfo.id} />
        <LeaderboardButton leaderboardId={leaderboard.id} />
      </div>

      <div className="bg-accent-deep flex flex-wrap items-center justify-between gap-4 rounded-b-xl">
        <div className="flex items-center gap-2 p-4">
          <PlayerAvatar
            profilePicture={getScoreSaberAvatar(score.score.playerInfo)}
            name={score.score.playerInfo.name ?? ""}
            className="size-14"
          />
          <div>
            <p>{score.score.playerInfo.name}</p>
            {score.score.hmd && (
              <div className="flex items-center gap-2 text-sm">
                <HMDIcon hmd={getHMDInfo(score.score.hmd!)} />
                <p>{score.score.hmd}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
