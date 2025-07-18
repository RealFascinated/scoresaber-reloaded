"use client";

import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import Combobox from "@/components/ui/combo-box";
import { PlayedMapsCalendarStat } from "@ssr/common/response/played-maps-calendar-response";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { getDaysInMonth, Months } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type ScoreHistoryCalendarProps = {
  playerId: string;
};

export default function ScoreHistoryCalendar({ playerId }: ScoreHistoryCalendarProps) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [days, setDays] = useState<number[]>([]);

  const { data: calendar, isLoading } = useQuery({
    queryKey: ["scoreHistoryCalendar", playerId, year, month],
    queryFn: async () => {
      return ssrApi.getScoreCalendar(playerId, year, month);
    },
    placeholderData: data => data,
  });

  // Update days only when calendar data changes
  useEffect(() => {
    const daysInMonth = getDaysInMonth(month, year);
    setDays(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  }, [month, year, calendar]);

  // Calculate the highest score set for sizing circles
  const getMaxMaps = (days: Record<number, PlayedMapsCalendarStat>) => {
    return Math.max(...Object.values(days).map(day => day.totalMaps));
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-2 select-none">
      {isLoading ? (
        <Spinner /> // Only show Spinner for initial load
      ) : (
        <>
          <div className="flex items-center justify-center gap-1">
            {/* Year Selection Combobox */}
            <Combobox<string>
              items={Object.keys(calendar?.metadata || {})
                .sort((a, b) => Number(a) - Number(b))
                .map(year => ({
                  value: year,
                  name: <p>{year}</p>,
                }))}
              value={String(year)}
              onValueChange={newYear => {
                if (newYear) setYear(Number(newYear));
              }}
            />

            {/* Month Selection Combobox */}
            <Combobox<string>
              items={
                calendar?.metadata[year]?.map((monthValue: number) => ({
                  value: String(monthValue),
                  name: <p>{Months.find(m => m.number === monthValue)?.name}</p>,
                })) || []
              }
              value={String(month)}
              onValueChange={newMonth => {
                if (newMonth) setMonth(Number(newMonth));
              }}
            />
          </div>

          <div className="grid grid-cols-7 items-center justify-center gap-1">
            {days.map(day => {
              const stats = calendar?.days[day];
              const totalMaps = stats ? stats.totalMaps : 0;
              const maxMaps = calendar ? getMaxMaps(calendar.days) : 1;
              const minSize = 40;
              const maxSize = 90;
              const scorePercentage = (totalMaps / maxMaps) * 100;
              const size =
                totalMaps === 0 ? 0 : Math.max(minSize, Math.min(scorePercentage, maxSize));

              return (
                <SimpleTooltip
                  key={day}
                  display={
                    <div className="flex flex-col gap-2">
                      <p className="font-semibold">Scores Set</p>

                      {stats && size > 0 ? (
                        <div>
                          <p>Total Maps: {stats.totalMaps}</p>
                          <p>Unranked: {stats.unrankedMaps}</p>
                          <p>Ranked: {stats.rankedMaps}</p>
                        </div>
                      ) : (
                        <p>No Scores Set</p>
                      )}
                    </div>
                  }
                >
                  <div className="bg-accent relative flex h-[45px] w-[45px] cursor-default items-center justify-center rounded-md lg:h-[60px] lg:w-[60px]">
                    <div
                      style={{
                        width: `${size}%`,
                        height: `${size}%`,
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                      }}
                      className="absolute flex items-center justify-center rounded-full"
                    />
                    <p className="z-10">{day}</p>
                  </div>
                </SimpleTooltip>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
