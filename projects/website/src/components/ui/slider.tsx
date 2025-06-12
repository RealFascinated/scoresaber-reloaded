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
        "relative flex w-full touch-none select-none items-center text-[15px] pt-2",
        className
      )}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-primary/10 select-none">
        <SliderPrimitive.Range className="absolute h-full bg-primary transition-colors duration-200" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-md ring-offset-background transition-all duration-200 hover:scale-110 hover:border-primary/80 focus:outline-none focus:ring-0 disabled:pointer-events-none disabled:opacity-50 select-none"
        onKeyDown={handleKeyDown}
      >
        {label && (
          <span
            className={cn(
              "absolute flex w-fit min-w-[2rem] justify-center items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-sm font-medium transition-opacity duration-200 -translate-x-[30%] select-none",
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
