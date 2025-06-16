"use client";

import { cn } from "@/common/utils";
import SimpleTooltip from "@/components/simple-tooltip";
import { normalizedRegionName } from "@ssr/common/utils/region-utils";
import Image from "next/image";
import { useState } from "react";

type Props = {
  code: string;
  size?: number;
  className?: string;
};

export default function CountryFlag({ code, size = 24, className }: Props) {
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
      className={cn(`w-[${size * 2}px] min-w-[${size * 2}px]`, className)}
    >
      <Image
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
