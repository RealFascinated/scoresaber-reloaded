import HMDIcon from "@/components/hmd-icon";
import { PlayerAvatar } from "@/components/ranking/player-avatar";
import { getHMDInfo } from "@ssr/common/hmds";
import { PlayerScore } from "@ssr/common/score/player-score";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import { formatDate } from "@ssr/common/utils/time-utils";
import { CalendarDays } from "lucide-react";
import Card from "../../../card";
import ScoreSongInfo from "../../score-song-info";
import LeaderboardButton from "./buttons/leaderboard-button";
import PlayerButton from "./buttons/player-button";
import ReplayButton from "./buttons/replay-button";

export default function ScoreDetails({ score: playerScore }: { score: PlayerScore }) {
  const { leaderboard } = playerScore;
  const score = playerScore.score;
  const playerInfo = score.playerInfo!;

  return (
    <Card className="overflow-hidden rounded-xl p-0">
      <div className="p-4">
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
          beatSaverMap={playerScore.beatSaver}
          leaderboardId={leaderboard.id}
        />
      </div>

      <div className="border-border flex flex-wrap items-center gap-2 border-t px-4 py-3 sm:gap-2.5">
        <ReplayButton score={score} />
        <PlayerButton playerId={playerInfo.id} />
        <LeaderboardButton leaderboardId={leaderboard.id} />
      </div>

      <div className="bg-accent-deep/90 border-border flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <PlayerAvatar
            profilePicture={getScoreSaberAvatar(playerInfo)}
            name={playerInfo.name ?? ""}
            className="size-14 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{playerInfo.name}</p>
            {score.hmd && (
              <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                <HMDIcon hmd={getHMDInfo(score.hmd)} />
                <span>{score.hmd}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-muted-foreground flex shrink-0 items-center gap-2 sm:justify-end">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <span className="text-sm whitespace-nowrap">
            {formatDate(score.timestamp, "Do MMMM, YYYY HH:mm a")}
          </span>
        </div>
      </div>
    </Card>
  );
}
