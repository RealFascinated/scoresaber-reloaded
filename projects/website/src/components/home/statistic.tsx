"use client";

import CountUp from "react-countup";
import { ReactElement } from "react";

type Statistic = {
  icon: ReactElement;
  title: string;
  value: number;
};

export default function Statistic({ icon, title, value }: Statistic) {
  return (
    <div className="flex flex-col gap-2 text-center items-center text-lg">
      {icon}
      <h1 className="font-semibold text-ssr">{title}</h1>
      <span>
        <CountUp end={value} duration={1.2} enableScrollSpy scrollSpyOnce />
      </span>
    </div>
  );
}
