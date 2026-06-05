"use client";

import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
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
    <div className="hover:bg-accent flex items-center justify-between gap-2 rounded-md p-2 transition-all select-none">
      <SimpleLink
        href={`/player/${player.id}`}
        onClick={() => onClick?.()}
        className="flex w-full items-center gap-2"
      >
        <Avatar src={player.avatar} size={40} alt={`${player.name}'s Profile Picture`} />
        <div className="flex flex-col">
          <p className="font-semibold">{player.name}</p>
          {player.inactive ? (
            <p className="text-inactive-account">Inactive Account</p>
          ) : (
            <p className="text-gray-400">#{formatNumberWithCommas(player.rank)}</p>
          )}
        </div>
      </SimpleLink>
      <SimpleTooltip
        display={<p className="pointer-events-none cursor-default">Remove {name} from your friends</p>}
      >
        <ConfirmationDialog
          trigger={
            <div className="cursor-pointer">
              <SharedIcons.RemoveFriendFromListIcon className="h-5 w-5" />
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
