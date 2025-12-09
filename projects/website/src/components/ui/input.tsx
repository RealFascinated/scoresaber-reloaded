import * as React from "react";

import { cn } from "@/common/utils";

function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "border-muted/50 placeholder:text-muted-foreground focus-visible:ring-primary/50 hover:border-primary/50 bg-muted flex h-9 w-full rounded-(--radius-md) border px-(--spacing-lg) py-(--spacing-xs) text-sm shadow-xs transition-colors duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
Input.displayName = "Input";

export { Input };
