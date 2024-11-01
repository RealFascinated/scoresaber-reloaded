import { LogoBaseProps } from "@/components/logos/logo-props";

export default function LogoBase({ size = 32, className, href, alt }: LogoBaseProps) {
  return <img width={size} height={size} className={className} src={href} alt={alt} />;
}
