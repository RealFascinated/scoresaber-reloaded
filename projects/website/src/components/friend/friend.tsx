import Avatar from "@/components/avatar";
import SimpleTooltip from "@/components/simple-tooltip";
import useDatabase from "@/hooks/use-database";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { XIcon } from "lucide-react";
import Link from "next/link";
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

  /**
   * Adds this player as a friend
   */
  async function removeFriend() {
    await database.removeFriend(id);
    toast.success(`You have removed ${name} as a friend.`);
  }

  return (
    <div className="hover:bg-accent flex items-center justify-between gap-2 rounded-md p-2 transition-all select-none">
      <Link
        href={`/player/${player.id}`}
        onClick={() => onClick?.()}
        className="flex w-full items-center gap-2"
      >
        <Avatar
          src={player.avatar}
          size={64}
          className="h-10 w-10"
          alt={`${player.name}'s Profile Picture`}
        />
        <div className="flex flex-col">
          <p className="font-semibold">{player.name}</p>
          {player.inactive ? (
            <p className="text-inactive-account">Inactive Account</p>
          ) : (
            <p className="text-gray-400">#{formatNumberWithCommas(player.rank)}</p>
          )}
        </div>
      </Link>
      <SimpleTooltip
        display={
          <p className="pointer-events-none cursor-default">Remove {name} from your friends</p>
        }
      >
        <div onClick={() => removeFriend()}>
          <XIcon className="h-5 w-5" />
        </div>
      </SimpleTooltip>
    </div>
  );
}
