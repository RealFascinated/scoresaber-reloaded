import { LogoProps } from "@/components/logos/logo-props";
import LogoBase from "@/components/logos/logo-base";
import { cn } from "@/common/utils";

export default function SteamLogo({ size = 32, className }: LogoProps) {
  return (
    <LogoBase
      size={size}
      href={"/assets/logos/steam.svg"}
      alt={"Steam Logo"}
      className={cn("invert", className)}
    />
  );
}
