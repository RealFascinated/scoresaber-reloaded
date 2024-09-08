import SearchPlayer from "@/app/components/input/search-player";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
};

export default function Search() {
  return (
    <div className="flex flex-col h-full w-full items-center justify-center gap-2">
      <div className="mb-4 mt-2 flex h-[150px] w-[150px] items-center justify-center rounded-full select-none bg-gray-600">
        <p className="text-9xl">?</p>
      </div>

      <div className="flex flex-col items-center text-center">
        <p className="font-bold text-2xl">Search Player</p>
        <p className="text-gray-400">Find yourself or a friend</p>
      </div>
      <SearchPlayer />
    </div>
  );
}
