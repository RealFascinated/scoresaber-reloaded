"use client";

import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import { Spinner } from "@/components/spinner";
import CountryFlag from "@/components/ui/country-flag";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePlayerFollowList, usePlayerFollows } from "@/hooks/use-following";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { useState } from "react";

type FollowList = "followers" | "following";

const LIST_TITLES: Record<FollowList, string> = {
  followers: "Followers",
  following: "Following",
};

function FollowListDialog({
  player,
  list,
  count,
}: {
  player: ScoreSaberPlayer;
  list: FollowList;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  const { players, isLoading } = usePlayerFollowList(player.id, list, open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="hover:text-primary flex cursor-pointer items-baseline gap-1 transition-colors"
        >
          <span className="font-semibold tabular-nums">{formatNumberWithCommas(count)}</span>
          <span className="text-muted-foreground">{LIST_TITLES[list]}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="border-border border-b px-5 pt-5 pb-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            {LIST_TITLES[list]}
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
              {formatNumberWithCommas(count)}
            </span>
          </DialogTitle>
          <DialogDescription>
            {list === "followers"
              ? `Players that follow ${player.name}`
              : `Players that ${player.name} follows`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-24 flex-col overflow-y-auto p-2">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          {!isLoading && players.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">Nobody yet</p>
          )}
          {players.map(listed => (
            <div
              key={listed.id}
              className="hover:bg-accent flex items-center gap-3 rounded-lg p-2 transition-colors"
            >
              <SimpleLink
                href={`/player/${listed.id}`}
                onClick={() => setOpen(false)}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar
                  src={listed.avatar}
                  size={44}
                  alt={`${listed.name}'s Profile Picture`}
                  className="shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-sm font-semibold">{listed.name}</p>
                  <span className="text-muted-foreground flex items-center gap-2 text-xs tabular-nums">
                    <span>#{formatNumberWithCommas(listed.rank)}</span>
                    <span className="flex items-center gap-1">
                      <CountryFlag code={listed.country} size={5} />#
                      {formatNumberWithCommas(listed.countryRank)}
                    </span>
                  </span>
                </div>
                <span className="text-pp shrink-0 text-sm font-semibold tabular-nums">
                  {formatPp(listed.pp)}pp
                </span>
              </SimpleLink>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The follower and following counts of a player, each opens the list of players.
 */
export default function PlayerFollows({ player }: { player: ScoreSaberPlayer }) {
  const { data: follows } = usePlayerFollows(player.id);
  if (!follows) {
    // Keep the row's height while the counts load (or can't load) so what is below it doesn't move
    return <div className="h-5" />;
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <FollowListDialog player={player} list="followers" count={follows.followers} />
      <FollowListDialog player={player} list="following" count={follows.following} />
    </div>
  );
}
