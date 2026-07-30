import FallbackLink from "@/components/fallback-link";
import { ScoreSaberScoreModifiers } from "@/components/platform/scoresaber/score/score-modifiers";
import { PlayerAvatar } from "@/components/ranking/player-avatar";
import SimpleTooltip from "@/components/simple-tooltip";
import { SharedIcons } from "@/shared-icons";
import { getHMDInfo } from "@ssr/common/hmds";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { PlayerScore } from "@ssr/common/score/player-score";
import { formatNumber, formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate, formatTime } from "@ssr/common/utils/time-utils";
import Image from "next/image";
import LeaderboardButton from "./buttons/leaderboard-button";
import PlayerButton from "./buttons/player-button";
import ReplayButton from "./buttons/replay-button";

type ScoreDetailsProps = {
  score: PlayerScore<ScoreSaberScore>;
};

export default function ScoreDetails({ score: playerScore }: ScoreDetailsProps) {
  const { leaderboard } = playerScore;
  const score = playerScore.score;
  const playerInfo = score.playerInfo!;
  const beatSaver = playerScore.beatSaver;
  const diff = getDifficulty(leaderboard.difficulty.difficulty);

  const isRanked = leaderboard.stars > 0;
  const weightedPp = score.weight ? score.pp * score.weight : undefined;

  return (
    <div className="ring-border bg-card overflow-hidden rounded-xl ring-1">
      {/* Player bar */}
      <div className="border-border/50 flex flex-wrap items-center gap-3 border-b px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <FallbackLink href={`/player/${playerInfo.id}`}>
            <PlayerAvatar
              profilePicture={playerInfo.avatar}
              name={playerInfo.name ?? ""}
              className="size-7 shrink-0"
            />
          </FallbackLink>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FallbackLink
              href={`/player/${playerInfo.id}`}
              className="hover:text-primary truncate text-sm font-medium transition-colors"
            >
              {playerInfo.name}
            </FallbackLink>
            <span className="text-muted-foreground hidden text-xs sm:inline">·</span>
            <span className="text-muted-foreground hidden truncate text-xs sm:inline">
              {formatDate(score.timestamp, "DD MMMM YYYY HH:mm")}
            </span>
            {score.hmd && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <SharedIcons.HeadMountedDisplayIcon hmd={getHMDInfo(score.hmd)} />
                <span className="hidden sm:inline">{score.hmd}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <ReplayButton score={score} />
          <PlayerButton playerId={playerInfo.id} />
          <LeaderboardButton leaderboardId={leaderboard.id} />
        </div>
      </div>

      {/* Main content — leaderboard-page style */}
      <div className="flex flex-col gap-5 p-4">
        {/* Song header row */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          {/* Album art */}
          <Image
            src={leaderboard.songArt}
            alt={`${leaderboard.fullName} cover`}
            className="border-border/80 mx-auto shrink-0 rounded-xl border object-cover shadow-md sm:mx-0"
            width={96}
            height={96}
          />

          {/* Song info */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
            {/* Song name */}
            <FallbackLink
              href={`/leaderboard/${leaderboard.id}`}
              className="hover:text-primary/80 transition-all sm:w-fit"
            >
              <h2 className="text-xl leading-tight font-bold sm:text-2xl">{leaderboard.fullName}</h2>
            </FallbackLink>

            {/* Author and mapper */}
            <p className="text-muted-foreground text-sm">
              by <span className="text-foreground font-medium">{leaderboard.songAuthorName}</span>
              {beatSaver?.author.name && (
                <>
                  {" · "}
                  mapped by{" "}
                  <FallbackLink
                    href={`https://beatsaver.com/profile/${beatSaver.author.id}`}
                    className="text-foreground hover:text-primary/80 font-medium transition-all"
                  >
                    {beatSaver.author.name}
                  </FallbackLink>
                </>
              )}
            </p>

            {/* Difficulty + Characteristic + Stars */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: `color-mix(in srgb, ${diff.color} 25%, transparent)`,
                  color: diff.color,
                }}
              >
                {getDifficultyName(leaderboard.difficulty.difficulty)}
              </span>
              <span className="text-muted-foreground/70 text-xs">{leaderboard.difficulty.characteristic}</span>
              {isRanked && (
                <span className="bg-background/90 ring-border text-yellow-400 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1">
                  <SharedIcons.DifficultyStarIcon className="size-3" />
                  {leaderboard.stars.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Hero score stats */}
          <div className="flex shrink-0 flex-col items-center gap-1 sm:items-end">
            {isRanked && score.pp > 0 ? (
              <span className="text-pp text-3xl leading-none font-extrabold tabular-nums">
                {formatPp(score.pp)}pp
              </span>
            ) : (
              <span className="text-3xl leading-none font-bold tabular-nums">
                {formatNumberWithCommas(score.score)}
              </span>
            )}

            <div className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
              <span className="tabular-nums">{formatScoreAccuracy(score.accuracy)}</span>
              {score.fullCombo ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="text-xs font-semibold text-green-400">FC</span>
                </>
              ) : (
                <>
                  <span aria-hidden>·</span>
                  <span className="text-xs font-semibold text-red-400">
                    {score.misses} miss{score.misses !== 1 ? "es" : ""}
                  </span>
                </>
              )}
            </div>

            {isRanked && weightedPp && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatPp(weightedPp)}pp weighted
              </span>
            )}

            {score.modifiers.length > 0 && (
              <SimpleTooltip
                side="bottom"
                display={
                  <div>
                    <p className="font-semibold">Modifiers</p>
                    <ScoreSaberScoreModifiers type="full" score={score} />
                  </div>
                }
              >
                <div className="border-border bg-background/90 ring-border mt-0.5 inline-flex cursor-default items-center gap-1.5 rounded-md px-2 py-1 text-[11px] ring-1">
                  <span className="text-muted-foreground">Mods</span>
                  <span className="font-medium">
                    <ScoreSaberScoreModifiers type="simple" score={score} />
                  </span>
                </div>
              </SimpleTooltip>
            )}
          </div>
        </div>

        {/* Map stats — same style as leaderboard page */}
        {beatSaver?.difficulty && (
          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs sm:justify-start">
            <span className="flex items-center gap-1.5">
              <SharedIcons.MapLengthStatIcon className="size-3.5" />
              <span className="text-foreground font-semibold tabular-nums">
                {formatTime(beatSaver.metadata.duration)}
              </span>
              <span>Length</span>
            </span>
            <span className="flex items-center gap-1.5">
              <SharedIcons.MapBpmStatIcon className="size-3.5" />
              <span className="text-foreground font-semibold tabular-nums">
                {formatNumberWithCommas(beatSaver.metadata.bpm)}
              </span>
              <span>BPM</span>
            </span>
            <span className="flex items-center gap-1.5">
              <SharedIcons.MapNpsStatIcon className="size-3.5" />
              <span className="text-foreground font-semibold tabular-nums">
                {beatSaver.difficulty.nps.toFixed(2)}
              </span>
              <span>NPS</span>
            </span>
            <span className="flex items-center gap-1.5">
              <SharedIcons.MapNjsStatIcon className="size-3.5" />
              <span className="text-foreground font-semibold tabular-nums">
                {formatNumber(beatSaver.difficulty.njs, "number")}
              </span>
              <span>NJS</span>
            </span>
            <span className="flex items-center gap-1.5">
              <SharedIcons.MapNotesStatIcon className="size-3.5" />
              <span className="text-foreground font-semibold tabular-nums">
                {formatNumberWithCommas(beatSaver.difficulty.notes)}
              </span>
              <span>Notes</span>
            </span>
            <span className="flex items-center gap-1.5">
              <SharedIcons.MapBombsStatIcon className="size-3.5" />
              <span className="text-foreground font-semibold tabular-nums">
                {formatNumberWithCommas(beatSaver.difficulty.bombs)}
              </span>
              <span>Bombs</span>
            </span>
            <span className="flex items-center gap-1.5">
              <SharedIcons.MapObstaclesStatIcon className="size-3.5" />
              <span className="text-foreground font-semibold tabular-nums">
                {formatNumberWithCommas(beatSaver.difficulty.obstacles)}
              </span>
              <span>Obstacles</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
