import { ChartNoAxesCombined, Database, Flame } from "lucide-react";
import { cn, getRandomInteger } from "@/common/utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { Difficulty, getDifficulty, getRandomDifficulty } from "@/common/song-utils";
import { AnimatedList } from "@/components/ui/animated-list";

type ScoreProps = {
  songArt: string;
  songName: string;
  songAuthor: string;
  setBy: string;
};

let scores: ScoreProps[] = [
  {
    songArt: "https://cdn.scoresaber.com/covers/B1D3FA6D5305837DF59B5E629A412DEBC68BBB46.png",
    songName: "LORELEI",
    songAuthor: "Camellia",
    setBy: "ImFascinated",
  },
  {
    songArt: "https://cdn.scoresaber.com/covers/7C44CDC1E33E2F5F929867B29CEB3860C3716DDC.png",
    songName: "Time files",
    songAuthor: "xi",
    setBy: "Minion",
  },
  {
    songArt: "https://cdn.scoresaber.com/covers/8E4B7917C01E5987A5B3FF13FAA3CA8F27D21D34.png",
    songName: "RATATA",
    songAuthor: "Skrillex, Missy Elliot & Mr. Oizo",
    setBy: "Rainnny",
  },
  {
    songArt: "https://cdn.scoresaber.com/covers/98F73BD330852EAAEBDC695140EAC8F2027AEEC8.png",
    songName: "Invasion of Amorphous Trepidation",
    songAuthor: "Diabolic Phantasma",
    setBy: "Bello",
  },
  {
    songArt: "https://cdn.scoresaber.com/covers/666EEAC0F3EEE2278DCB971AC1D27421A0335801.png",
    songName: "Yotsuya-san ni Yoroshiku",
    songAuthor: "Eight",
    setBy: "ACC | NoneTaken",
  },
];
scores = Array.from({ length: 32 }, () => scores).flat();

export default function RealtimeScores() {
  return (
    <div
      className={cn(
        "relative px-5 -mt-20 flex flex-col lg:flex-row-reverse gap-10 select-none",
        "before:absolute before:-left-40 before:-bottom-36 before:size-[28rem] before:bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] before:from-yellow-600 before:rounded-full before:blur-3xl before:opacity-30"
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-2.5 text-right items-end">
        <div className="flex flex-row-reverse gap-3 items-center text-yellow-400">
          <Flame className="p-2 size-11 bg-yellow-800/15 rounded-lg" />
          <h1 className="text-3xl sm:text-4xl font-bold">Realtime Scores</h1>
        </div>
        <p className="max-w-2xl lg:max-w-5xl text-sm sm:text-base opacity-85">
          <span className="text-lg font-semibold text-yellow-500">Nec detracto voluptatibus!</span> Vulputate duis
          dolorum iuvaret disputationi ceteros te noluisse himenaeos bibendum dolores molestiae lorem elaboraret porro
          brute tation simul laudem netus odio has in tibique.
        </p>
      </div>

      {/* Content */}
      <div className="w-full flex flex-col justify-center items-center overflow-hidden">
        <AnimatedList className="w-full max-w-[32rem] h-96 divide-y divide-muted" delay={1500}>
          {scores.map((score, index) => (
            <Score key={index} {...score} />
          ))}
        </AnimatedList>
      </div>
    </div>
  );
}

function Score({ songArt, songName, songAuthor, setBy }: ScoreProps) {
  const difficulty: Difficulty = getRandomDifficulty();
  return (
    <figure className="py-2 flex flex-col text-sm">
      {/* Set By */}
      <span>
        Set by <span className="text-ssr">{setBy}</span>
      </span>

      {/* Score */}
      <div className="py-3 flex gap-4 xs:gap-5 items-center transition-all transform-gpu">
        {/* Position & Time */}
        <div className="w-20 xs:w-24 flex flex-col gap-1 text-center items-center">
          <div className="flex gap-2 items-center">
            <GlobeAmericasIcon className="size-5" />
            <span className="text-ssr">#{getRandomInteger(1, 900)}</span>
          </div>
          <span>just now</span>
        </div>

        {/* Song Art & Difficulty */}
        <div className="relative">
          <img className="size-16 rounded-md" src={songArt} alt={`Song art for ${songName} by ${songAuthor}`} />
          <div
            className="absolute inset-x-0 bottom-0 py-px flex justify-center text-xs rounded-t-lg"
            style={{
              backgroundColor: getDifficulty(difficulty).color + "f0", // Transparency value (in hex 0-255)
            }}
          >
            {difficulty.name}
          </div>
        </div>

        {/* Song Name & Author */}
        <div className="flex flex-col gap-1">
          <h1 className="max-w-[11rem] xs:max-w-full text-ssr">{songName}</h1>
          <p className="max-w-[11rem] xs:max-w-full opacity-75">{songAuthor}</p>
        </div>
      </div>
    </figure>
  );
}
