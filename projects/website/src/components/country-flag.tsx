"use client";

import SimpleTooltip from "@/components/simple-tooltip";
import { normalizedRegionName } from "@ssr/common/utils/region-utils";
import { useState } from "react";

type Props = {
  code: string;
  size?: number;
};

export default function CountryFlag({ code, size = 24 }: Props) {
  const [flagSrc, setFlagSrc] = useState(
    `https://cdn.fascinated.cc/assets/flags/${code.toLowerCase()}.png`
  );

  const handleError = () => {
    // Set fallback flag source if the main flag fails to load
    setFlagSrc(`https://cdn.fascinated.cc/assets/flags/unknown.png`);
  };

  return (
    <SimpleTooltip
      display={<p>{normalizedRegionName(code)}</p>}
      className={`w-[${size * 2}px] min-w-[${size * 2}px]`}
    >
      <img
        alt="Country Flag"
        src={flagSrc}
        width={size * 2}
        height={size * 2}
        className="object-contain"
        style={{
          width: size * 2,
          minWidth: size * 2,
        }}
        onError={handleError} // Handle error to load fallback
      />
    </SimpleTooltip>
  );
}
