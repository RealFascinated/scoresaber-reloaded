import { Database } from "lucide-react";
import { kyFetch } from "@ssr/common/utils/utils";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import { Config } from "@ssr/common/config";
import { AppStats } from "@/components/app-statistics";

export default async function SiteStats() {
  const statistics = await kyFetch<AppStatistics>(Config.apiUrl + "/statistics");
  return (
    <div className="px-5 -mt-20 flex flex-col gap-10 select-none">
      {/* Header */}
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-3.5 items-center">
          <Database className="size-7 text-pp" />
          <h1 className="text-4xl font-bold text-ssr">Site Statistics</h1>
        </div>
        <p className="opacity-85">posidonium novum ancillae ius conclusionemque splendide vel.</p>
      </div>

      {/* Content */}
      {statistics && <AppStats initialStatistics={statistics} />}
    </div>
  );
}
