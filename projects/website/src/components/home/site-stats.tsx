import { ChartNoAxesCombined } from "lucide-react";
import { kyFetchJson } from "@ssr/common/utils/utils";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import { Config } from "@ssr/common/config";
import { AppStats } from "@/components/app-statistics";

export default async function SiteStats() {
  const statistics = await kyFetchJson<AppStatistics>(Config.apiUrl + "/statistics");
  return (
    <div id="stats" className="px-5 -mt-20 flex flex-col gap-10 select-none">
      {/* Header */}
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-3 items-center text-orange-600">
          <ChartNoAxesCombined className="p-2 size-10 bg-orange-800/15 rounded-lg" />
          <h1 className="text-2xl sm:text-3xl font-bold">Site Statistics</h1>
        </div>
        <p className="max-w-5xl opacity-85">
          Discover insights into our community’s activity with real-time site statistics, showcasing the total scores
          set, additional scores data, and more.
        </p>
      </div>

      {/* Content */}
      {statistics && <AppStats initialStatistics={statistics} />}
    </div>
  );
}
