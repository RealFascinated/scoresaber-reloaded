import { cn } from "@/common/utils";
import Image from "next/image";

export function PlayerAvatar({
  profilePicture,
  name,
  className,
}: {
  profilePicture: string;
  name: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Image
        src={profilePicture}
        alt={name}
        width={28}
        height={28}
        fetchPriority="high"
        className={cn("size-7 min-w-7 rounded-full border border-[#333] object-cover", className)}
      />
    </div>
  );
}
