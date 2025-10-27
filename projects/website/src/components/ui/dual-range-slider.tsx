"use client";

import { cn } from "@/common/utils";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

interface DualRangeSliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  labelPosition?: "top" | "bottom";
  label?: (value: number | undefined) => React.ReactNode;
}

function DualRangeSlider({
  className,
  label,
  labelPosition = "top",
  ...props
}: DualRangeSliderProps) {
  const initialValue = Array.isArray(props.value) ? props.value : [props.min, props.max];

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
      {initialValue.map((value, index) => (
        <React.Fragment key={index}>
          <SliderPrimitive.Thumb
            className="border-primary bg-background ring-offset-background hover:border-primary/80 block h-5 w-5 select-none rounded-full border-2 shadow-md transition-all duration-200 focus:outline-none focus:ring-0 disabled:pointer-events-none disabled:opacity-50"
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
                {label(value)}
              </span>
            )}
          </SliderPrimitive.Thumb>
        </React.Fragment>
      ))}
    </SliderPrimitive.Root>
  );
}

export { DualRangeSlider };
