"use client";

import { SharedIcons } from "@/shared-icons";
import { type ChatChoice, ChatChoiceSchema } from "@ssr/common/schemas/chat/tools/select-tools";
import { checkSchema } from "@ssr/common/schemas/parse";
import { getScoreSaberLeaderboardCoverUrl } from "@ssr/common/utils/scoresaber.util";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import type { ReactNode } from "react";

/**
 * Reads a selectLeaderboard or selectSong output, or undefined when it isn't one.
 */
export function readChatChoice(output: object) {
  if (!checkSchema(ChatChoiceSchema, output)) {
    return undefined;
  }
  const choice = output as ChatChoice;
  return choice;
}

const OPTION_CLASS =
  "flex h-14 w-full items-center gap-3 rounded-xl bg-card px-2.5 text-left text-sm ring-1 ring-border transition-colors enabled:cursor-pointer enabled:hover:bg-accent/60 disabled:opacity-70";

function OptionButton({
  songHash,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  songHash: string;
  title: string;
  subtitle: string;
  trailing: ReactNode;
  onClick: (() => void) | undefined;
}) {
  return (
    <li>
      <button type="button" disabled={onClick === undefined} onClick={onClick} className={OPTION_CLASS}>
        <img
          src={getScoreSaberLeaderboardCoverUrl(songHash)}
          alt=""
          loading="lazy"
          className="size-10 shrink-0 rounded-md object-cover"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold text-song-name">{title}</span>
          <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums">{trailing}</span>
      </button>
    </li>
  );
}

function Stars({ stars }: { stars: number }) {
  if (stars <= 0) {
    return <span className="text-muted-foreground">Unranked</span>;
  }
  return (
    <span className="flex items-center gap-0.5 font-medium">
      {stars.toFixed(2)}
      <SharedIcons.DifficultyStarIcon className="size-3" />
    </span>
  );
}

/**
 * The options of a selectLeaderboard or selectSong call; picking one sends it as the user's next message.
 */
export default function ChatChoiceCard({
  choice,
  onSelect,
}: {
  choice: ChatChoice;
  onSelect: ((text: string) => void) | undefined;
}) {
  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <p className="text-sm font-medium">{choice.question}</p>
      <ul className="flex flex-col gap-1.5">
        {choice.kind === "leaderboard-choice"
          ? choice.options.map(option => {
              const difficultyName = getDifficultyName(option.difficulty);
              return (
                <OptionButton
                  key={option.leaderboardId}
                  songHash={option.songHash}
                  title={option.songName}
                  subtitle={`${option.songAuthorName} · mapped by ${option.levelAuthorName}`}
                  trailing={
                    <>
                      <span
                        className="rounded-md px-1.5 py-0.5 font-medium text-white"
                        style={{ backgroundColor: getDifficulty(option.difficulty).color }}
                      >
                        {difficultyName}
                      </span>
                      <Stars stars={option.stars} />
                    </>
                  }
                  onClick={
                    onSelect &&
                    (() =>
                      onSelect(`${option.songName} ${difficultyName} (leaderboard ${option.leaderboardId})`))
                  }
                />
              );
            })
          : choice.options.map(option => (
              <OptionButton
                key={option.songHash}
                songHash={option.songHash}
                title={option.songName}
                subtitle={`${option.songAuthorName} · mapped by ${option.levelAuthorName}`}
                trailing={
                  <span className="text-muted-foreground">
                    {option.difficultyCount} {option.difficultyCount === 1 ? "difficulty" : "difficulties"}
                    {option.maxStars > 0 && ` · up to ${option.maxStars.toFixed(2)}★`}
                  </span>
                }
                onClick={
                  onSelect &&
                  (() =>
                    onSelect(
                      `${option.songName} by ${option.songAuthorName}, mapped by ${option.levelAuthorName}`
                    ))
                }
              />
            ))}
      </ul>
    </div>
  );
}
