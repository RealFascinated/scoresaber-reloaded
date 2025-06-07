import { env } from "@ssr/common/env";

export default function myImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality: number;
}) {
  // Ignored types
  if (src.endsWith(".svg") || src.endsWith(".gif")) {
    return src;
  }

  // If the image is a relative path, prepend the base URL
  if (src.startsWith("/")) {
    src = `${env.NEXT_PUBLIC_WEBSITE_URL}${src}`;
  }

  // Return the proxied image
  return `https://image.fascinated.cc/${encodeURIComponent(
    src
  )}?width=${width}&quality=${quality || 80}&optimize=true`;
}
