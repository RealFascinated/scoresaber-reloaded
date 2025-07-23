import { cn } from "@/common/utils";

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
      <img
        src={profilePicture}
        alt={name}
        fetchPriority="high"
        className={cn("size-7 min-w-7 rounded-full border border-[#333] object-cover", className)}
      />
    </div>
  );
}
