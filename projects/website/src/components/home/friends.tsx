import { UsersRound } from "lucide-react";

export default function Friends() {
  return (
    <div className="px-5 -mt-20 flex flex-col gap-10 items-end select-none">
      {/* Header */}
      <div className="flex flex-col gap-2.5 text-right items-end">
        <div className="flex flex-row-reverse gap-3 items-center text-purple-600">
          <UsersRound className="p-2 size-11 bg-purple-800/15 rounded-lg" />
          <h1 className="text-3xl sm:text-4xl font-bold">Friends</h1>
        </div>
        <p className="max-w-5xl text-sm sm:text-base opacity-85">
          posidonium novum ancillae ius conclusionemque splendide vel.
        </p>
      </div>

      {/* Content */}
      <div className="max-w-[900px]">
        <img
          className="w-full h-full rounded-2xl border border-ssr/20"
          src="/assets/home/friends.png"
          alt="Friends"
          draggable={false}
        />
      </div>
    </div>
  );
}
