import Image from "next/image";

type BeatSaberPepeLogoProps = {
  size?: number;
};

export default function BeatSaberPepeLogo({ size = 32 }: BeatSaberPepeLogoProps) {
  return <Image width={size} height={size} unoptimized src={"/assets/bs-pepe.gif"} alt={"BeatSaber Pepe Logo"}></Image>;
}
