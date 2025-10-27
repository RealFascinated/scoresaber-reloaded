"use client";

import { cn } from "@/common/utils";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  labelPosition?: "top" | "bottom";
  label?: (value: number | undefined) => React.ReactNode;
}

function Slider({ className, label, labelPosition = "top", ...props }: SliderProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
  };

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none select-none items-center pt-2 text-[15px]",
        className
      )}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <SliderPrimitive.Track className="bg-primary/10 relative h-2 w-full grow select-none overflow-hidden rounded-full">
        <SliderPrimitive.Range className="bg-primary absolute h-full transition-colors duration-200" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="border-primary bg-background ring-offset-background hover:border-primary/80 block h-5 w-5 select-none rounded-full border-2 shadow-md transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-0 disabled:pointer-events-none disabled:opacity-50"
        onKeyDown={handleKeyDown}
      >
        {label && (
          <span
            className={cn(
              "bg-primary/10 text-primary absolute flex w-fit min-w-[2rem] -translate-x-[30%] select-none items-center justify-center rounded-md px-1.5 py-0.5 text-sm font-medium transition-opacity duration-200",
              labelPosition === "top" && "-top-8",
              labelPosition === "bottom" && "top-6"
            )}
          >
            {label(Array.isArray(props.value) ? props.value[0] : props.value)}
          </span>
        )}
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  );
}
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
