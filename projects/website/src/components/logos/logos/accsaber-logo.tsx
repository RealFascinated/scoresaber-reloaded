import LogoBase from "@/components/logos/logo-base";
import { LogoProps } from "@/components/logos/logo-props";

export default function AccSaberLogo({ size = 32, className }: LogoProps) {
  return (
    <LogoBase
      size={size}
      href={"https://cdn.fascinated.cc/assets/logos/accsaber.webp"}
      alt={"AccSaber Logo"}
      className={className}
    />
  );
}
