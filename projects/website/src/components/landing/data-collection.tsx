import { Database } from "lucide-react";
import Image from "next/image";

export default function DataCollection() {
  return (
    <div id="data-collection" className="px-5 -mt-40 flex flex-col gap-10 select-none">
      {/* Header */}
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-3 items-center text-pp">
          <Database className="p-2 size-10 bg-ssr/15 rounded-lg" />
          <h1 className="text-2xl sm:text-3xl font-bold">Data Collection</h1>
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
          className="w-full h-full rounded-2xl border border-ssr/20"
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
