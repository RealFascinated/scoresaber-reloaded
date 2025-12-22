import HMDIcon from "@/components/hmd-icon";
import { PlayerAvatar } from "@/components/ranking/player-avatar";
import { getHMDInfo } from "@ssr/common/hmds";
import { PlayerScore } from "@ssr/common/score/player-score";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import Card from "../../../card";
import ScoreSongInfo from "../../score-song-info";
import LeaderboardButton from "./buttons/leaderboard-button";
import PlayerButton from "./buttons/player-button";
import ReplayButton from "./buttons/replay-button";

export default function ScoreDetails({ score }: { score: PlayerScore }) {
  const { leaderboard } = score;

  return (
    <Card className="p-0">
      <div className="flex flex-col p-4">
        <ScoreSongInfo
          song={{
            name: leaderboard.fullName,
            authorName: leaderboard.songAuthorName,
            art: leaderboard.songArt,
          }}
          level={{
            authorName: leaderboard.levelAuthorName,
            difficulty: leaderboard.difficulty.difficulty,
          }}
        />
      </div>

      {/* Score Buttons */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
        <ReplayButton score={score.score} />
        <PlayerButton playerId={score.score.playerInfo.id} />
        <LeaderboardButton leaderboardId={leaderboard.id} />
      </div>

      <div className="bg-accent-deep/90 flex flex-wrap items-center justify-between gap-4 rounded-b-md">
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
    </Card>
  );
}
