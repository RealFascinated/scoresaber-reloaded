"use client";

import { cn } from "@/common/utils";
import Image from "next/image";
import { useState } from "react";

type AvatarProps = {
  src: string;
  size?: number;
  className?: string;
  alt: string;
};

export default function Avatar({ src, size = 32, className, alt }: AvatarProps) {
  const [failedForSrc, setFailedForSrc] = useState<string | null>(null);
  const showFallback = !src || failedForSrc === src;
  const fallbackText = alt?.trim().slice(0, 1).toUpperCase();

  if (showFallback) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "bg-muted text-muted-foreground flex items-center justify-center rounded-full",
          className
        )}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
        }}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <Image
      src={src}
      width={size}
      height={size}
      className={cn("rounded-full", className)}
      alt={alt}
      onError={() => setFailedForSrc(src)}
      style={{
        minWidth: size,
        minHeight: size,
      }}
    />
  );
}
