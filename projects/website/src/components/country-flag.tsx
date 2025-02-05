"use client";

import Tooltip from "@/components/tooltip";
import { normalizedRegionName } from "@ssr/common/utils/region-utils";
import { useState } from "react";

type Props = {
  code: string;
  size?: number;
};

export default function CountryFlag({ code, size = 24 }: Props) {
  const [flagSrc, setFlagSrc] = useState(`/assets/flags/${code.toLowerCase()}.png`);

  const handleError = () => {
    // Set fallback flag source if the main flag fails to load
    setFlagSrc(`/assets/flags/unknown.png`);
  };

  return (
    <Tooltip
      display={<p>{normalizedRegionName(code)}</p>}
      className={`w-[${size * 2}px] min-w-[${size * 2}px]`}
    >
      <img
        alt="Country Flag"
        src={flagSrc}
        width={size * 2}
        height={size * 2}
        className={`w-[${size * 2}px] min-w-[${size * 2}px] object-contain`}
        onError={handleError} // Handle error to load fallback
      />
    </Tooltip>
  );
}
