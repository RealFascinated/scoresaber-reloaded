import { LogoProps } from "@/components/logos/logo-props";
import LogoBase from "@/components/logos/logo-base";

export default function BeatSaberPepeLogo({ size = 32, className }: LogoProps) {
  return (
    <LogoBase
      size={size}
      href={"/assets/bs-pepe.gif"}
      alt={"BeatSaber Pepe Logo"}
      className={className}
      optimized={false}
    />
  );
}
