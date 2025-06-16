import { HMDInfo } from "@ssr/common/hmds";
import Image from "next/image";

export default function HMDIcon({ hmd }: { hmd: HMDInfo }) {
  return (
    <Image
      src={`https://cdn.fascinated.cc/assets/hmds/${hmd.logo}`}
      alt={`${hmd.logo} Logo`}
      width={24}
      height={24}
      className="w-5 h-5 rounded-full"
      style={{
        filter: hmd.filters,
      }}
    />
  );
}
