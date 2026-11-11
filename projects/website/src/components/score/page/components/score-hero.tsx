import FallbackLink from "@/components/fallback-link";
import { ScoreSaberScoreModifiers } from "@/components/platform/scoresaber/score/score-modifiers";
import { PlayerAvatar } from "@/components/ranking/player-avatar";
import SimpleTooltip from "@/components/simple-tooltip";
import { SharedIcons } from "@/shared-icons";
import { getHMDInfo } from "@ssr/common/hmds";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { PlayerScore } from "@ssr/common/score/player-score";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import Image from "next/image";
import LeaderboardButton from "./buttons/leaderboard-button";
import PlayerButton from "./buttons/player-button";
import ReplayButton from "./buttons/replay-button";
import { DeltaChip } from "./delta-chip";

type ScoreHeroProps = {
  score: PlayerScore<ScoreSaberScore>;
};

export default function ScoreHero({ score: playerScore }: ScoreHeroProps) {
  const { leaderboard, beatSaver } = playerScore;
  const score = playerScore.score;
  const playerInfo = score.playerInfo!;
  const previous = score.previousScore;
  const diff = getDifficulty(leaderboard.difficulty.difficulty);

  const isRanked = leaderboard.stars > 0;
  const showPp = isRanked && score.pp > 0;
  const weightedPp = score.weight ? score.pp * score.weight : undefined;

  return (
    <section className="ring-border bg-card relative overflow-hidden rounded-xl ring-1">
      {/* Blurred cover backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Image
          src={leaderboard.songArt}
          alt=""
          fill
          sizes="100vw"
          className="scale-125 object-cover opacity-30 blur-2xl"
        />
        <div className="from-card/40 via-card/70 to-card absolute inset-0 bg-gradient-to-b" />
      </div>

      <div className="relative flex flex-col">
        {/* Top bar: who / when / actions */}
        <div className="border-border/50 flex flex-wrap items-center gap-3 border-b px-4 py-2.5">
          <div className="flex min-w-0 basis-full items-center gap-2.5 sm:flex-1 sm:basis-0">
            <FallbackLink href={`/player/${playerInfo.id}`}>
              <PlayerAvatar
                profilePicture={playerInfo.avatar}
                name={playerInfo.name ?? ""}
                className="size-7 shrink-0"
              />
            </FallbackLink>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <FallbackLink
                href={`/player/${playerInfo.id}`}
                className="hover:text-primary truncate text-sm font-medium transition-colors"
              >
                {playerInfo.name}
              </FallbackLink>
              <SimpleTooltip display={formatDate(score.timestamp, "DD MMMM YYYY HH:mm")}>
                <span className="text-muted-foreground cursor-default text-xs">
                  {timeAgo(score.timestamp, 1)}
                </span>
              </SimpleTooltip>
              {score.hmd && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <SharedIcons.HeadMountedDisplayIcon hmd={getHMDInfo(score.hmd)} />
                  <span className="hidden sm:inline">{score.hmd}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex w-full items-center gap-1.5 sm:w-auto">
            <ReplayButton score={score} />
            <PlayerButton playerId={playerInfo.id} />
            <LeaderboardButton leaderboardId={leaderboard.id} />
          </div>
        </div>

        {/* Main: cover + song info + headline numbers */}
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
            <Image
              src={leaderboard.songArt}
              alt={`${leaderboard.fullName} cover`}
              className="border-border/80 shrink-0 rounded-xl border object-cover shadow-lg"
              width={128}
              height={128}
              priority
            />

            <div className="flex min-w-0 flex-col items-center gap-2 sm:items-start">
              <FallbackLink
                href={`/leaderboard/${leaderboard.id}`}
                className="hover:text-primary/80 transition-all"
              >
                <h1 className="text-xl leading-tight font-bold sm:text-3xl">{leaderboard.fullName}</h1>
              </FallbackLink>

              <p className="text-muted-foreground text-sm">
                by <span className="text-foreground font-medium">{leaderboard.songAuthorName}</span>
                {beatSaver?.author.name && (
                  <>
                    {" · "}mapped by{" "}
                    <FallbackLink
                      href={`https://beatsaver.com/profile/${beatSaver.author.id}`}
                      className="text-foreground hover:text-primary/80 font-medium transition-all"
                    >
                      {beatSaver.author.name}
                    </FallbackLink>
                  </>
                )}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${diff.color} 18%, transparent)`,
                    color: diff.color,
                  }}
                >
                  {getDifficultyName(leaderboard.difficulty.difficulty)}
                </span>
                <span className="text-muted-foreground/70 text-xs">
                  {leaderboard.difficulty.characteristic}
                </span>
                {isRanked && (
                  <span className="bg-control ring-border text-warning inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1">
                    <SharedIcons.DifficultyStarIcon className="size-3" />
                    {leaderboard.stars.toFixed(2)}
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
                    <span className="bg-control ring-border inline-flex cursor-default items-center gap-1.5 rounded-md px-2 py-0.5 text-xs ring-1">
                      <span className="text-muted-foreground">Mods</span>
                      <span className="font-medium">
                        <ScoreSaberScoreModifiers type="simple" score={score} />
                      </span>
                    </span>
                  </SimpleTooltip>
                )}
              </div>
            </div>
          </div>

          {/* Headline numbers */}
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-end">
            <div className="flex flex-col items-center gap-1 lg:items-end">
              {showPp ? (
                <span className="text-pp text-4xl leading-none font-extrabold tabular-nums lg:text-5xl">
                  {formatPp(score.pp)}
                  <span className="text-2xl">pp</span>
                </span>
              ) : (
                <span className="text-4xl leading-none font-extrabold tabular-nums lg:text-5xl">
                  {formatNumberWithCommas(score.score)}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                {showPp && previous?.change.pp !== undefined && (
                  <DeltaChip value={previous.change.pp} format={v => `${formatPp(Math.abs(v))}pp`} />
                )}
                {showPp && weightedPp !== undefined && weightedPp > 0 && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatPp(weightedPp)}pp weighted
                  </span>
                )}
              </div>
            </div>

            <div className="bg-border hidden h-14 w-px sm:block" />

            <div className="flex flex-col items-center gap-1 lg:items-end">
              <span className="text-3xl leading-none font-bold tabular-nums lg:text-4xl">
                {formatScoreAccuracy(score.accuracy)}
              </span>
              <div className="flex items-center gap-1.5">
                {previous && (
                  <DeltaChip value={previous.change.accuracy} format={v => `${Math.abs(v).toFixed(2)}%`} />
                )}
                {score.fullCombo && <span className="text-success text-xs font-semibold">Full Combo</span>}
              </div>
            </div>

            {score.rank > 0 && (
              <>
                <div className="bg-border hidden h-14 w-px sm:block" />
                <div className="flex flex-col items-center gap-1 lg:items-end">
                  <span className="text-3xl leading-none font-bold tabular-nums lg:text-4xl">
                    #{score.rank}
                  </span>
                  <span className="text-muted-foreground text-xs">Leaderboard rank</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
