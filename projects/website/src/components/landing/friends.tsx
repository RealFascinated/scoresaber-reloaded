import { cn } from "@/common/utils";
import { UsersRound } from "lucide-react";
import Image from "next/image";

export default function Friends() {
  return (
    <div id="friends" className="px-5 -mt-20 flex flex-col gap-10 items-end select-none">
      {/* Header */}
      <div className="flex flex-col gap-2.5 text-right items-end">
        <div className="flex flex-row-reverse gap-3 items-center text-purple-600">
          <UsersRound className="p-2 size-10 bg-purple-800/15 rounded-lg" />
          <h1 className="text-2xl sm:text-3xl font-bold">Friends</h1>
        </div>
        <p className="max-w-5xl opacity-85">
          Connect with friends to share your Beat Saber experience! Add friends to your list and see
          their latest scores, achievements, and play history in a dynamic feed. Keep up with their
          top plays, challenge their records, and join them in competitive runs as you progress
          together.
        </p>
      </div>

      {/* Content */}
      <div
        className={cn(
          "relative",
          "before:absolute before:-left-36 before:-top-28 before:size-[23.5rem] xs:before:size-[32rem] before:bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] before:from-purple-600 before:rounded-full before:blur-3xl before:opacity-30 before:overflow-hidden before:z-1"
        )}
      >
        <div className={cn("relative max-w-[900px] z-20 overflow-hidden")}>
          <Image
            className="w-full h-full rounded-2xl border border-purple-600/20"
            src="https://cdn.fascinated.cc/assets/home/friends.png"
            alt="Friends"
            draggable={false}
            width={900}
            height={500}
          />
        </div>
      </div>
    </div>
  );
}
