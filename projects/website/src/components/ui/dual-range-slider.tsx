"use client";

import { cn } from "@/common/utils";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

interface DualRangeSliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  labelPosition?: "top" | "bottom" | "none";
  label?: (value: number | undefined) => React.ReactNode;
  showLabelOnHover?: boolean;
}

export function DualRangeSlider({
  className,
  label,
  labelPosition = "top",
  showLabelOnHover = true,
  value,
  min = 0,
  max = 100,
  onValueChange,
  ...props
}: DualRangeSliderProps) {
  const [isHovering, setIsHovering] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const currentValue = Array.isArray(value) && value.length === 2 ? value : [min, max];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
  };

  const showLabel = labelPosition !== "none" && (!showLabelOnHover || isHovering || isDragging);

  return (
    
      <SliderPrimitive.Root
        {...props}
        className={cn(
          "relative flex flex-1 touch-none items-center pt-2 text-[15px] select-none",
          className
        )}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        value={currentValue}
        min={min}
        max={max}
        onValueChange={onValueChange}
      >
        <SliderPrimitive.Track className="bg-primary/10 relative h-2 w-full grow overflow-hidden rounded-full select-none">
          <SliderPrimitive.Range className="bg-primary absolute h-full transition-colors duration-200" />
        </SliderPrimitive.Track>
        {currentValue.map((val, index) => (
          <SliderPrimitive.Thumb
            key={index}
            className="border-primary bg-background ring-offset-background hover:border-primary/80 block h-5 w-5 rounded-full border-2 shadow-md transition-all duration-200 select-none focus:ring-0 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
            onKeyDown={handleKeyDown}
          >
            {label && showLabel && (
              <span
                className={cn(
                  "bg-primary/10 text-primary pointer-events-none absolute flex w-fit min-w-8 -translate-x-[30%] items-center justify-center rounded-md px-1.5 py-0.5 text-sm font-medium select-none",
                  "animate-in fade-in-0 zoom-in-95 duration-150",
                  labelPosition === "top" && "-top-8",
                  labelPosition === "bottom" && "top-6"
                )}
              >
                {label(val)}
              </span>
            )}
          </SliderPrimitive.Thumb>
        ))}
      </SliderPrimitive.Root>
  );
}
