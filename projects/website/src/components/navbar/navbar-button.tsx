import { cn } from "@/common/utils";
import { HTMLAttributes, ReactNode } from "react";

type Props = {
  className?: string;
  children: ReactNode;
};

export default function NavbarButton({
  className,
  children,
  ...props
}: Props & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-all hover:opacity-80",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
