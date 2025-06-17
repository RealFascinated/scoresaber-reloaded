import { cn } from "@/common/utils";
import { UsersRound } from "lucide-react";
import Image from "next/image";

export default function Friends() {
  return (
    <div id="friends" className="-mt-20 flex flex-col items-end gap-10 px-5 select-none">
      {/* Header */}
      <div className="flex flex-col items-end gap-2.5 text-right">
        <div className="flex flex-row-reverse items-center gap-3 text-purple-600">
          <UsersRound className="size-10 rounded-lg bg-purple-800/15 p-2" />
          <h1 className="text-2xl font-bold sm:text-3xl">Friends</h1>
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
          "xs:before:size-[32rem] before:absolute before:-top-28 before:-left-36 before:z-1 before:size-[23.5rem] before:overflow-hidden before:rounded-full before:bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] before:from-purple-600 before:opacity-30 before:blur-3xl"
        )}
      >
        <div className={cn("relative z-20 max-w-[900px] overflow-hidden")}>
          <Image
            className="h-full w-full rounded-2xl border border-purple-600/20"
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
