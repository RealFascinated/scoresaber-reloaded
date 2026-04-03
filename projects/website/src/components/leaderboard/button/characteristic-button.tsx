import { cn } from "@/common/utils";
import { Button } from "@/components/ui/button";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import Image from "next/image";
import SimpleLink from "../../simple-link";
import SimpleTooltip from "../../simple-tooltip";

type CharacteristicButtonProps = {
  characteristic: MapCharacteristic;
  leaderboardId: number;
  selectedCharacteristic: MapCharacteristic;
};

const fallbackIcon = "�";
const characteristicIcons: Partial<Record<MapCharacteristic & string, string>> = {
  Standard: "/assets/characteristics/standard.svg",
  OneSaber: "/assets/characteristics/onesaber.svg",
  NoArrows: "/assets/characteristics/noarrows.svg",
  Lawless: "/assets/characteristics/lawless.svg",
  "90Degree": "/assets/characteristics/90degree.svg",
  "360Degree": "/assets/characteristics/360degree.svg",
  Lightshow: "/assets/characteristics/lightshow.svg",
};

export function CharacteristicButton({
  characteristic,
  leaderboardId,
  selectedCharacteristic,
}: CharacteristicButtonProps) {
  const isSelected = characteristic === selectedCharacteristic;
  const buttonId = `characteristic-btn-${characteristic}`;
  const icon = characteristicIcons[characteristic];

  return (
    <SimpleTooltip display={characteristic}>
      <SimpleLink href={`/leaderboard/${leaderboardId}`}>
        <style>{`
        #${buttonId}.characteristic-button-hover:hover {
          filter: brightness(1) !important;
        }
      `}</style>
        <Button
          id={buttonId}
          variant="ghost"
          className={cn(
            "difficulty-button-hover rounded-b-none border-none px-(--spacing-lg) py-(--spacing-sm) text-white transition-all duration-200",
            isSelected ? "font-bold" : ""
          )}
          style={{
            backgroundColor: isSelected ? "var(--primary)" : "var(--secondary)",
            filter: isSelected ? "brightness(1)" : "brightness(0.7)",
          }}
        >
          {icon ? (
            <Image src={icon} alt={characteristic} width={20} height={20} />
          ) : (
            <span>{fallbackIcon}</span>
          )}
        </Button>
      </SimpleLink>
    </SimpleTooltip>
  );
}
