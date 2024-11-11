import { DetailedHTMLProps, ImgHTMLAttributes } from "react";
import { default as NextImage } from "next/image";

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

  return (
    <NextImage
      src={src}
      width={Number(width)}
      height={Number(height)}
      className={className}
      alt={alt!}
      unoptimized={!optimized}
      {...props}
    />
  );
}
