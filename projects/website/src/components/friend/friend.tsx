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
    toast(`You have removed ${name} as a friend.`);
  }

  return (
    <div className="flex items-center justify-between gap-2 hover:bg-accent transition-all p-2 rounded-md select-none">
      <Link
        href={`/player/${player.id}`}
        onClick={() => onClick?.()}
        className="flex items-center gap-2 w-full"
      >
        <Avatar
          src={player.avatar}
          size={64}
          className="w-10 h-10"
          alt={`${player.name}'s Profile Picture`}
        />
        <div className="flex flex-col">
          <p className="font-semibold">{player.name}</p>
          {player.inactive ? (
            <p className="text-gray-400">Inactive Account</p>
          ) : (
            <p className="text-gray-400">#{formatNumberWithCommas(player.rank)}</p>
          )}
        </div>
      </Link>
      <SimpleTooltip
        display={
          <p className="cursor-default pointer-events-none">Remove {name} from your friends</p>
        }
      >
        <div onClick={() => removeFriend()}>
          <XIcon className="w-5 h-5" />
        </div>
      </SimpleTooltip>
    </div>
  );
}
