import { DetailedHTMLProps, ImgHTMLAttributes } from "react";
import { Config } from "@ssr/common/config";
import { isProduction } from "@/common/website-utils";

type ImageProps = DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> & {
  /**
   * The size of the image
   */
  size?: number;

  /**
   * The image will be optimized. Defaults to true
   */
  optimized?: boolean;
};

export default function Image({
  src,
  size = 32,
  width,
  height,
  className,
  alt,
  optimized = true,
  ...props
}: ImageProps) {
  if (!src) {
    throw new Error("Image src is required");
  }
  width = width ?? size;
  height = height ?? size;

  if (src.startsWith("/") && optimized) {
    if (isProduction()) {
      src = `${Config.websiteUrl}${src}`;
    } else {
      optimized = false;
      console.log(`Local image "${src}" is not able to be optimized`);
    }
  }
  const formattedUrl = optimized ? `https://img.fascinated.cc/upload/w_${width},h_${height}/${src}` : src;
  return <img src={formattedUrl} width={width} height={height} className={className} alt={alt} {...props} />;
}
