import { LogoProps } from "@/components/logos/logo-props";
import LogoBase from "@/components/logos/logo-base";

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
