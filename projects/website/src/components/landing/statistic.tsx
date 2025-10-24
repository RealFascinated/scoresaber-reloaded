"use client";

import SimpleTooltip from "@/components/simple-tooltip";
import { CircleStackIcon } from "@heroicons/react/24/outline";
import { ReactElement } from "react";
import CountUp from "react-countup";

type Statistic = {
  icon: ReactElement<any>;
  title: string;
  value: number;
  isCache?: boolean;
};

export default function Statistic({ icon, title, value, isCache }: Statistic) {
  return (
    <div className="text-md flex flex-col items-center gap-2 text-center">
      {icon}
      <h1 className="font-semibold text-orange-400/85">
        {title}{" "}
        {isCache && (
          <span>
            <SimpleTooltip display="This is data we cache locally">
              <CircleStackIcon className="inline h-4 w-4" />
            </SimpleTooltip>
          </span>
        )}
      </h1>
      <span>
        <CountUp end={value} duration={1.2} enableScrollSpy scrollSpyOnce preserveValue={true} />
      </span>
    </div>
  );
}
