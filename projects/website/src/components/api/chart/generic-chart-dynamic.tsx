"use client";

import dynamic from "next/dynamic";

const GenericChart = dynamic(() => import("./generic-chart"), { ssr: false });

export default GenericChart;
