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
        "relative flex w-full touch-none select-none items-center text-[15px] pt-2",
        className
      )}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-primary/10 select-none">
        <SliderPrimitive.Range className="absolute h-full bg-primary transition-colors duration-200" />
      </SliderPrimitive.Track>
      {initialValue.map((value, index) => (
        <React.Fragment key={index}>
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
