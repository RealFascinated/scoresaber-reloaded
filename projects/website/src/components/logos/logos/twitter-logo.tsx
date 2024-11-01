import LogoBase from "@/components/logos/logo-base";
import { LogoProps } from "@/components/logos/logo-props";

export default function TwitterLogo({ size = 32, className }: LogoProps) {
  return <LogoBase size={size} href={"/assets/logos/twitter.png"} alt={"Twitter Logo"} className={className} />;
}
