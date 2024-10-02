import ScoreSaberLogo from "../logos/scoresaber-logo";

type Props = {
  reason: string;
};

export default function FullscreenLoader({ reason }: Props) {
  return (
    <div className="absolute w-screen h-screen bg-background brightness-75 flex flex-col gap-6 items-center justify-center">
      <div className="flex flex-col items-center justify-center">
        <p className="text-white text-xl font-bold">ScoreSaber Reloaded</p>
        <p className="text-gray-300 text-md">{reason}</p>
      </div>
      <div className="animate-spin">
        <ScoreSaberLogo />
      </div>
    </div>
  );
}
