import { cn } from "@/common/utils";
import LogoBase from "@/components/logos/logo-base";
import { LogoProps } from "@/components/logos/logo-props";

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
