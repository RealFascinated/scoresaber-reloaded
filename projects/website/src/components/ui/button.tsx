import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/common/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        default:
          "border border-primary bg-background/95 backdrop-blur-sm relative before:absolute before:inset-0 before:bg-primary/10 before:rounded-md text-primary shadow-sm hover:before:bg-primary/20",
        destructive:
          "border border-destructive bg-background/95 backdrop-blur-sm relative before:absolute before:inset-0 before:bg-destructive/10 before:rounded-md text-destructive shadow-xs hover:before:bg-destructive/20",
        outline:
          "border border-border bg-background/95 backdrop-blur-sm text-foreground shadow-xs hover:text-accent-foreground hover:border-primary/50",
        secondary:
          "border border-border bg-background/95 backdrop-blur-sm relative before:absolute before:inset-0 before:bg-secondary/10 before:rounded-md text-secondary-foreground shadow-xs hover:before:bg-secondary/20 hover:border-primary/50",
        ghost:
          "border border-border bg-background/95 backdrop-blur-sm text-foreground hover:text-accent-foreground hover:border-primary/50",
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
