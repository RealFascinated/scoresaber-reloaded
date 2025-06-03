import LogoBase from "@/components/logos/logo-base";
import { LogoProps } from "@/components/logos/logo-props";

export default function BeatSaberPepeLogo({ size = 32, className }: LogoProps) {
  return (
    <LogoBase
      size={size}
      href={"https://cdn.fascinated.cc/assets/bs-pepe.gif"}
      alt={"BeatSaber Pepe Logo"}
      className={className}
    />
  );
}
