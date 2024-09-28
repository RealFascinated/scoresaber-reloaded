import { Button } from "@/components/ui/button";
import { ArrowDownIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { Dispatch, SetStateAction } from "react";

type Props = {
  isLeaderboardExpanded: boolean;
  setIsLeaderboardExpanded: Dispatch<SetStateAction<boolean>>;
};

export default function LeaderboardButton({
  isLeaderboardExpanded,
  setIsLeaderboardExpanded,
}: Props) {
  return (
    <div className="pr-2 flex items-center justify-center h-full cursor-default">
      <Button
        className="p-0 hover:bg-transparent"
        variant="ghost"
        onClick={() => setIsLeaderboardExpanded(!isLeaderboardExpanded)}
      >
        <ArrowDownIcon
          className={clsx(
            "w-6 h-6 transition-all transform-gpu",
            isLeaderboardExpanded ? "" : "rotate-180",
          )}
        />
      </Button>
    </div>
  );
}
