"use client";

import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import CountryFlag from "@/components/ui/country-flag";
import useDatabase from "@/hooks/use-database";
import { SharedIcons } from "@/shared-icons";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { toast } from "sonner";

type FriendProps = {
  /**
   * The friend to display.
   */
  player: ScoreSaberPlayer;

  /**
   * When the friend is clicked
   */
  onClick?: () => void;
};

export default function Friend({ player, onClick }: FriendProps) {
  const { id, name } = player;
  const database = useDatabase();

  async function removeFriend() {
    await database.removeFriend(id);
    toast.success(
      <p>
        You have removed <b>{name}</b> as a friend.
      </p>,
      {
        action: {
          label: "Undo",
          onClick: () => {
            void database.addFriend(id);
          },
        },
      }
    );
  }

  return (
    <div className="hover:bg-accent group flex items-center justify-between gap-2 rounded-lg p-2 transition-all select-none">
      <SimpleLink
        href={`/player/${player.id}`}
        onClick={() => onClick?.()}
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <Avatar src={player.avatar} size={36} alt={`${player.name}'s Profile Picture`} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-medium">{player.name}</p>
          {player.inactive ? (
            <span className="text-inactive-account text-xs">Inactive Account</span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <CountryFlag code={player.country} size={5} />#{formatNumberWithCommas(player.rank)}
            </span>
          )}
        </div>
      </SimpleLink>
      <SimpleTooltip
        display={<p className="pointer-events-none cursor-default">Remove {name} from your friends</p>}
      >
        <ConfirmationDialog
          trigger={
            <div className="text-muted-foreground hover:text-foreground cursor-pointer rounded-md p-1 opacity-0 transition-all group-hover:opacity-100">
              <SharedIcons.RemoveFriendFromListIcon className="size-4" />
            </div>
          }
          title={`Remove ${name}?`}
          description={`${name} will be removed from your friends list.`}
          confirmText="Remove"
          variant="destructive"
          onConfirm={removeFriend}
        />
      </SimpleTooltip>
    </div>
  );
}
