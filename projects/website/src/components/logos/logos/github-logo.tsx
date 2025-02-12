import { cn } from "@/common/utils";
import LogoBase from "@/components/logos/logo-base";
import { LogoProps } from "@/components/logos/logo-props";

export default function GithubLogo({ size = 32, className }: LogoProps) {
  return (
    <LogoBase
      size={size}
      href={"/assets/logos/github.png"}
      alt={"Github Logo"}
      className={cn("invert", className)}
    />
  );
}
