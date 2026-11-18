"use client";

import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import CountryFlag from "@/components/ui/country-flag";
import { useFollowActions } from "@/hooks/use-following";
import { SharedIcons } from "@/shared-icons";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { toast } from "sonner";

type FollowedPlayerProps = {
  player: ScoreSaberPlayer;

  onClick?: () => void;
};

export default function FollowedPlayer({ player, onClick }: FollowedPlayerProps) {
  const { id, name } = player;
  const { follow, unfollow } = useFollowActions();

  async function unfollowPlayer() {
    unfollow(id);
    toast.success(
      <p>
        You have unfollowed <b>{name}</b>.
      </p>,
      {
        action: {
          label: "Undo",
          onClick: () => {
            follow(id);
          },
        },
      }
    );
  }

  return (
    <div className="group flex items-center justify-between gap-2 rounded-lg p-2 transition-all select-none hover:bg-accent">
      <SimpleLink
        href={`/player/${player.id}`}
        onClick={() => onClick?.()}
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <Avatar src={player.avatar} size={36} alt={`${player.name}'s Profile Picture`} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-medium">{player.name}</p>
          {player.inactive ? (
            <span className="text-xs text-inactive-account">Inactive Account</span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CountryFlag code={player.country} size={5} />#{formatNumberWithCommas(player.rank)}
            </span>
          )}
        </div>
      </SimpleLink>
      <SimpleTooltip
        display={
          <p className="pointer-events-none cursor-default">Remove {name} from the players you follow</p>
        }
      >
        <ConfirmationDialog
          trigger={
            <div className="cursor-pointer rounded-md p-1 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:text-foreground">
              <SharedIcons.RemoveFollowingFromListIcon className="size-4" />
            </div>
          }
          title={`Unfollow ${name}?`}
          description={`${name} will be removed from the players you follow.`}
          confirmText="Unfollow"
          variant="destructive"
          onConfirm={unfollowPlayer}
        />
      </SimpleTooltip>
    </div>
  );
}
