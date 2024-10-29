import { Database } from "lucide-react";

export default function DataCollection() {
  return (
    <div className="px-5 -mt-32 flex flex-col gap-10 select-none">
      {/* Header */}
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-3.5 items-center">
          <Database className="size-7 text-pp" />
          <h1 className="text-4xl font-bold text-ssr">Data Collection</h1>
        </div>
        <p className="opacity-85">posidonium novum ancillae ius conclusionemque splendide vel.</p>
      </div>

      {/* Content */}
      <div className="max-w-[900px]">
        <img
          className="w-full h-full rounded-xl border border-ssr/20"
          src="/assets/home/data-collection.png"
          alt="Data Collection"
          draggable={false}
        />
      </div>
    </div>
  );
}
