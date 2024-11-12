import { cn } from "@/common/utils";
import Image from "next/image";

type AvatarProps = {
  src: string;
  size?: number;
  className?: string;
  alt: string;
};

export default function Avatar({ src, size = 32, className, alt }: AvatarProps) {
  return <Image src={src} width={size} height={size} className={cn("rounded-full", className)} alt={alt} priority />;
}
