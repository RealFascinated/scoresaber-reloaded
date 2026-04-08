import { cn } from "@/common/utils";
import { Button } from "@/components/ui/button";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { ScoreSaberLeaderboardDifficulty } from "@ssr/common/schemas/scoresaber/leaderboard/difficulty";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import Image from "next/image";
import SimpleLink from "../../simple-link";
import SimpleTooltip from "../../simple-tooltip";

type CharacteristicButtonProps = {
  leaderboardDifficulty: ScoreSaberLeaderboardDifficulty;
  selectedLeaderboardDifficulty: ScoreSaberLeaderboardDifficulty;
};

const characteristicIcons: Partial<Record<MapCharacteristic & string, string>> = {
  Standard: "/assets/characteristics/standard.svg",
  OneSaber: "/assets/characteristics/onesaber.svg",
  NoArrows: "/assets/characteristics/noarrows.svg",
  Lawless: "/assets/characteristics/lawless.svg",
  "90Degree": "/assets/characteristics/90degree.svg",
  "360Degree": "/assets/characteristics/360degree.svg",
  Lightshow: "/assets/characteristics/lightshow.svg",
  Generated90Degree: "/assets/characteristics/generated90degree.svg",
  Generated360Degree: "/assets/characteristics/generated360degree.svg",
};

export function CharacteristicButton({
  leaderboardDifficulty,
  selectedLeaderboardDifficulty,
}: CharacteristicButtonProps) {
  const isSelected = leaderboardDifficulty.characteristic === selectedLeaderboardDifficulty.characteristic;
  const buttonId = `characteristic-btn-${leaderboardDifficulty.id}`;
  const icon = characteristicIcons[leaderboardDifficulty.characteristic];
  const color = getDifficulty(
    isSelected ? selectedLeaderboardDifficulty.difficulty : leaderboardDifficulty.difficulty
  ).color;

  return (
    <SimpleTooltip display={leaderboardDifficulty.characteristic}>
      <SimpleLink href={`/leaderboard/${leaderboardDifficulty.id}`}>
        <style>{`
        #${buttonId}.characteristic-button-hover:hover {
          filter: brightness(1) !important;
        }
      `}</style>
        <Button
          id={buttonId}
          variant="ghost"
          className={cn(
            "difficulty-button-hover flex h-10 flex-col items-center justify-center rounded-b-none border-none px-(--spacing-md) py-(--spacing-sm) text-xs text-white transition-all duration-200",
            isSelected ? "font-bold" : ""
          )}
          style={{
            backgroundColor: color,
            filter: isSelected ? "brightness(1)" : "brightness(0.5)",
          }}
        >
          {icon ? (
            <Image src={icon} alt={leaderboardDifficulty.characteristic} width={20} height={20} />
          ) : (
            <QuestionMarkCircledIcon className="size-[20px]" />
          )}
        </Button>
      </SimpleLink>
    </SimpleTooltip>
  );
}
