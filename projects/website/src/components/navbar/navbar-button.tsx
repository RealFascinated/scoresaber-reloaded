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
        "px-2 gap-2 rounded-md text-sm hover:opacity-80 transform-gpu transition-all h-full flex items-center cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
