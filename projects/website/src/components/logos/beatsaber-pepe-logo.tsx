type BeatSaberPepeLogoProps = {
  size?: number;
};

export default function BeatSaberPepeLogo({ size = 32 }: BeatSaberPepeLogoProps) {
  return <img width={size} height={size} src={"/assets/bs-pepe.gif"} alt={"BeatSaber Pepe Logo"} />;
}
