import LogoBase from "@/components/logos/logo-base";
import { LogoProps } from "@/components/logos/logo-props";
import { cn } from "@/common/utils";

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
