import { Database } from "lucide-react";
import Image from "next/image";

export default function DataCollection() {
  return (
    <div id="data-collection" className="-mt-40 flex flex-col gap-10 px-5 select-none">
      {/* Header */}
      <div className="flex flex-col gap-2.5">
        <div className="text-pp flex items-center gap-3">
          <Database className="bg-ssr/15 size-10 rounded-lg p-2" />
          <h1 className="text-2xl font-bold sm:text-3xl">Data Collection</h1>
        </div>
        <p className="max-w-5xl opacity-85">
          Our platform collects and curates extensive player data, from scores to performance
          metrics, giving you an in-depth view of your gameplay like never before. Unlike other
          sites, we go beyond the basics, providing unmatched insights and tracking precision.
        </p>
      </div>

      {/* Content */}
      <div className="max-w-[900px]">
        <Image
          className="border-ssr/20 h-full w-full rounded-2xl border"
          src="https://cdn.fascinated.cc/assets/home/data-collection.png"
          alt="Data Collection"
          draggable={false}
          width={900}
          height={500}
        />
      </div>
    </div>
  );
}
