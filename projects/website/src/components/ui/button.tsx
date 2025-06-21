import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/common/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border border-primary bg-primary/10 text-primary shadow-sm hover:bg-primary/20",
        destructive:
          "border border-destructive bg-destructive/10 text-destructive shadow-xs hover:bg-destructive/20",
        outline:
          "border border-border bg-background text-muted-foreground shadow-xs hover:bg-accent hover:text-accent-foreground hover:border-primary/50",
        secondary:
          "border border-border bg-background text-muted-foreground shadow-xs hover:bg-secondary/80 hover:border-primary/50",
        ghost:
          "border border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }), "cursor-pointer")}
      {...props}
    />
  );
}
Button.displayName = "Button";

export { Button, buttonVariants };
