import { LogoBaseProps } from "@/components/logos/logo-props";
import Image from "@/components/image";

export default function LogoBase({ size = 32, className, href, alt, optimized = true }: LogoBaseProps) {
  return <Image width={size} height={size} className={className} src={href} alt={alt} optimized={optimized} />;
}
