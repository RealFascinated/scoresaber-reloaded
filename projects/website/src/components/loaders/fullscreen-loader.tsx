import { ReactNode } from "react";
import ScoreSaberLogo from "../logos/logos/scoresaber-logo";

type Props = {
  reason: string | ReactNode;
};

export default function FullscreenLoader({ reason }: Props) {
  return (
    <div className="bg-background absolute flex h-screen w-screen flex-col items-center justify-center gap-6 brightness-[66%]">
      <div className="flex flex-col items-center justify-center">
        <p className="text-xl font-bold text-white">ScoreSaber Reloaded</p>
        <div className="text-md text-center text-gray-300">{reason}</div>
      </div>
      <div className="animate-spin">
        <ScoreSaberLogo />
      </div>
    </div>
  );
}
