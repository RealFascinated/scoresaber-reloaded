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
  const [minValue, maxValue] = currentValue;
  const range = max - min || 1;
  const minPercent = ((minValue - min) / range) * 100;
  const maxPercent = ((maxValue - min) / range) * 100;
  const thumbGapPercent = Math.abs(maxPercent - minPercent);

  const getLabelOffsetPx = (thumbIndex: number) => {
    // Smoothly push labels apart when thumbs get close to avoid overlap.
    // 0px offset when far enough, up to +/- 22px when very close.
    const startPushingAtPercent = 14;
    const maxPushPx = 22;
    const t = Math.min(1, Math.max(0, (startPushingAtPercent - thumbGapPercent) / startPushingAtPercent));
    const push = t * maxPushPx;
    return thumbIndex === 0 ? -push : push;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
  };

  const showLabel = labelPosition !== "none" && (!showLabelOnHover || isHovering || isDragging);
  label =
    label ??
    ((val: number | undefined) => (
      <span className="text-xs">
        {val !== undefined ? (Number.isInteger(val) ? val.toString() : val.toFixed(1)) : "0"}
      </span>
    ));

  return (
    <SliderPrimitive.Root
      {...props}
      className={cn("relative flex flex-1 touch-none items-center pt-2 text-[15px] select-none", className)}
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
          key={index === 0 ? "min" : "max"}
          className="border-primary bg-background ring-offset-background hover:border-primary/80 block h-5 w-5 rounded-full border-2 shadow-md transition-all duration-200 select-none focus:ring-0 focus:outline-hidden disabled:pointer-events-none disabled:opacity-50"
          onKeyDown={handleKeyDown}
        >
          {showLabel && (
            <span
              className={cn(
                "bg-primary/10 text-primary pointer-events-none absolute flex w-fit min-w-8 items-center justify-center rounded-md px-1.5 py-0.5 text-sm font-medium select-none",
                "animate-in fade-in-0 zoom-in-95 duration-150",
                labelPosition === "top" && "-top-8",
                labelPosition === "bottom" && "top-6"
              )}
              style={{
                left: "50%",
                transform: `translateX(calc(-50% + ${getLabelOffsetPx(index)}px))`,
              }}
            >
              {label(val)}
            </span>
          )}
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  );
}
