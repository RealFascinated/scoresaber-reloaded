"use client";

import CountUp from "react-countup";

type Statistic = {
  title: string;
  value: number;
};

export default function Statistic({ title, value }: Statistic) {
  return (
    <p className="text-center">
      {title}: <CountUp end={value} duration={1.2} />
    </p>
  );
}
