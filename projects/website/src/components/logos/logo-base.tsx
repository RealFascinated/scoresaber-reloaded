import { LogoBaseProps } from "@/components/logos/logo-props";
import Image from "next/image";

export default function LogoBase({ size = 32, className, href, alt, optimized }: LogoBaseProps) {
  return <Image width={size} height={size} className={className} src={href!} alt={alt!} unoptimized={!optimized} />;
}
