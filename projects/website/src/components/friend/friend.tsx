import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import Link from "next/link";
import { XIcon } from "lucide-react";
import useDatabase from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import Tooltip from "@/components/tooltip";

type FriendProps = {
  /**
   * The friend to display.
   */
  player: ScoreSaberPlayerToken;

  /**
   * When the friend is clicked
   */
  onClick?: () => void;
};

export default function Friend({ player, onClick }: FriendProps) {
  const { id, name } = player;
  const database = useDatabase();
  const { toast } = useToast();

  /**
   * Adds this player as a friend
   */
  async function removeFriend() {
    await database.removeFriend(id);
    toast({
      title: "Friend Removed",
      description: `You have removed ${name} as a friend.`,
    });
  }

  return (
    <li className="flex items-center justify-between gap-2 hover:bg-accent transition-all transform-gpu p-2 rounded-md select-none">
      <Link href={`/player/${player.id}`} onClick={() => onClick?.()} className="flex items-center gap-2 w-full">
        <Avatar>
          <AvatarImage src={player.profilePicture} alt={player.name} />
        </Avatar>
        <div className="flex flex-col">
          <p className="text-lg font-semibold">{player.name}</p>
          <p className="text-gray-400">#{formatNumberWithCommas(player.rank)}</p>
        </div>
      </Link>
      <Tooltip display={<p className="cursor-default pointer-events-none">Remove {name} from your friends</p>}>
        <button onClick={() => removeFriend()}>
          <XIcon className="w-5 h-5" />
        </button>
      </Tooltip>
    </li>
  );
}
