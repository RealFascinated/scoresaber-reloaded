"use client";

import SimpleTooltip from "@/components/simple-tooltip";
import { normalizedRegionName } from "@ssr/common/utils/region-utils";
import { useState } from "react";

type Props = {
  code: string;
  size?: number;
  className?: string;
  tooltip?: (formattedName: string) => string;
};

export default function CountryFlag({ code, size = 24, className, tooltip }: Props) {
  const [flagSrc, setFlagSrc] = useState(
    `https://cdn.fascinated.cc/assets/flags/${code.toLowerCase()}.png`
  );

  const handleError = () => {
    // Set fallback flag source if the main flag fails to load
    setFlagSrc(`https://cdn.fascinated.cc/assets/flags/unknown.png`);
  };

  return (
    <SimpleTooltip
      display={<p>{tooltip ? tooltip(normalizedRegionName(code)) : normalizedRegionName(code)}</p>}
      className={className}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: size * 2,
          minWidth: size * 2,
        }}
      >
        <img
          alt="Country Flag"
          src={flagSrc}
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
