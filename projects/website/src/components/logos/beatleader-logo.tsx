import LogoBase from "@/components/logos/logo-base";

type BeatLeaderLogoProps = {
  size?: number;
  className?: string;
};

export default function BeatLeaderLogo({ size = 32, className }: BeatLeaderLogoProps) {
  return (
    <LogoBase
      size={size}
      href={"/assets/logos/beatleader.png"}
      alt={"BeatLeader Logo"}
      className={className}
    />
  );
}
