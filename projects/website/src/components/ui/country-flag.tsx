"use client";

import SimpleTooltip from "@/components/simple-tooltip";
import { normalizedRegionName } from "@ssr/common/utils/region-utils";
import Image from "next/image";
import { useState } from "react";

type Props = {
  code: string;
  size?: number;
  className?: string;
  tooltip?: (formattedName: string) => string;
  tooltipSide?: "top" | "bottom" | "left" | "right";
};

export default function CountryFlag({ code, size = 24, className, tooltip, tooltipSide = "top" }: Props) {
  const getFlagSrc = (nextCode: string) =>
    `https://cdn.fascinated.cc/assets/flags/${nextCode.toLowerCase()}.png`;

  const unknownSrc = "https://cdn.fascinated.cc/assets/flags/unknown.png";
  const [failedForCode, setFailedForCode] = useState<string | null>(null);
  const primarySrc = getFlagSrc(code);
  const flagSrc = failedForCode === code ? unknownSrc : primarySrc;

  const handleError = () => {
    setFailedForCode(code);
  };

  return (
    <SimpleTooltip
      display={<p>{tooltip ? tooltip(normalizedRegionName(code)) : normalizedRegionName(code)}</p>}
      className={className}
      side={tooltipSide}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: size * 2,
          minWidth: size * 2,
        }}
      >
        <Image
          alt="Country Flag"
          src={flagSrc}
          width={size * 2}
          height={size * 2}
          className="h-auto w-full object-contain"
          style={{
            maxHeight: size * 2,
          }}
          onError={handleError}
        />
      </div>
    </SimpleTooltip>
  );
}
