import { cn } from "@/common/utils";

type AvatarProps = {
  src: string;
  size?: number;
  className?: string;
  alt: string;
};

export default function Avatar({ src, size = 32, className, alt }: AvatarProps) {
  return (
    <img
      src={src}
      width={size}
      height={size}
      className={cn("rounded-full", className)}
      alt={alt}
      fetchPriority="high"
    />
  );
}
