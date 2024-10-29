import { Database } from "lucide-react";

export default function RealtimeScores() {
  return (
    <div className="px-5 -mt-20 flex flex-col gap-10 items-end select-none">
      {/* Header */}
      <div className="flex flex-col gap-2.5 items-end">
        <div className="flex gap-3.5 items-center">
          <Database className="size-7 text-pp" />
          <h1 className="text-4xl font-bold text-ssr">Realtime Scores</h1>
        </div>
        <p className="opacity-85">posidonium novum ancillae ius conclusionemque splendide vel.</p>
      </div>

      {/* Content */}
      <div className="max-w-[900px]">
        <img
          className="w-full h-full rounded-xl border border-ssr/20"
          src="/assets/home/realtime-scores.png"
          alt="Realtime Scores"
          draggable={false}
        />
      </div>
    </div>
  );
}
