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

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none select-none items-center text-[15px]",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {initialValue.map((value, index) => (
        <React.Fragment key={index}>
          <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow-sm transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            {label && (
              <span
                className={cn(
                  "absolute flex w-fit justify-center items-center",
                  labelPosition === "top" && "-top-6",
                  labelPosition === "bottom" && "top-4"
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
