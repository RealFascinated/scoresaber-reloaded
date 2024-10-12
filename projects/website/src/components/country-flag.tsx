import Tooltip from "@/components/tooltip";
import { normalizedRegionName } from "@ssr/common/utils/region-utils";

type Props = {
  code: string;
  size?: number;
};

export default function CountryFlag({ code, size = 24 }: Props) {
  return (
    <Tooltip display={<p>{normalizedRegionName(code)}</p>} asChild={false}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Player Country"
        src={`/assets/flags/${code.toLowerCase()}.png`}
        width={size * 2}
        className={`w-[${size * 2}px] object-contain`}
      />
    </Tooltip>
  );
}
