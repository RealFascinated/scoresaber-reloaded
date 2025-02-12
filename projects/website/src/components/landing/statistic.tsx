"use client";

import Tooltip from "@/components/tooltip";
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
    <div className="flex flex-col gap-2 text-center items-center text-md">
      {icon}
      <h1 className="font-semibold text-orange-400/85">
        {title}{" "}
        {isCache && (
          <span>
            <Tooltip display="This is data we cache locally">
              <CircleStackIcon className="w-4 h-4 inline" />
            </Tooltip>
          </span>
        )}
      </h1>
      <span>
        <CountUp end={value} duration={1.2} enableScrollSpy scrollSpyOnce />
      </span>
    </div>
  );
}
