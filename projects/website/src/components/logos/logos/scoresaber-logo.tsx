import LogoBase from "@/components/logos/logo-base";
import { LogoProps } from "@/components/logos/logo-props";

export default function ScoresaberLogo({ size = 32, className }: LogoProps) {
  return (
    <LogoBase
      size={size}
      href={"/assets/logos/scoresaber.png"}
      alt={"SaberSaber Logo"}
      className={className}
    />
  );
}
