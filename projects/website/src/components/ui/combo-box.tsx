"use client";

import { cn } from "@/common/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { ReactElement, ReactNode, useEffect, useState } from "react";

/**
 * The props for this combobox.
 */
type ComboboxProps<T> = {
  /**
   * The name of the combobox.
   */
  name: string;

  /**
   * The placeholder for the combobox.
   */
  placeholder?: string;

  /**
   * The items within the combobox.
   */
  items: ComboboxItem<T>[];

  /**
   * The controlled value of this combobox.
   */
  value?: T | undefined;

  /**
   * The function invoked when the value of this combobox changes.
   *
   * @param value the new value
   */
  onValueChange?: (value: T | undefined) => void;

  /**
   * The class name of this combobox.
   */
  className?: string;
};

export type ComboboxItem<T> = {
  /**
   * The value of this item.
   */
  value: T;

  /**
   * The icon to display next to the value.
   */
  icon?: ReactNode;

  /**
   * The name of this item.
   */
  name: string | ReactNode;

  /**
   * The class name of this item.
   */
  className?: string;
};

const Combobox = <T,>({
  name,
  placeholder,
  items,
  value: controlledValue,
  onValueChange,
  className,
}: ComboboxProps<T>): ReactElement<any> => {
  const [open, setOpen] = useState<boolean>(false);
  const [internalValue, setInternalValue] = useState<T | undefined>(controlledValue);

  // Update internal value when controlled value changes
  useEffect(() => {
    setInternalValue(controlledValue);
  }, [controlledValue]);

  // Use the controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (newValue: T | undefined) => {
    setInternalValue(newValue);
    onValueChange && onValueChange(newValue);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Name */}
      <h1 className="text-sm font-bold">{name}</h1>

      {/* Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            className="justify-between gap-3 px-2"
            variant="outline"
            role="combobox"
            aria-expanded={open}
          >
            {value ? items.find(item => item.value === value)?.name : "None"}
            <ChevronsUpDown className="ml-2 size-5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-fit p-0">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {items.map((item, index) => (
                  <CommandItem
                    key={index}
                    value={item.value as string}
                    onSelect={currentValue => {
                      const current = currentValue as T;
                      setOpen(false);
                      handleValueChange(current === value ? undefined : current);
                    }}
                    className={cn("flex items-center justify-between gap-2", item.className)}
                  >
                    {item.icon}
                    <div className={cn("flex w-full items-center justify-between gap-2")}>
                      <div className="flex items-center gap-2">{item.name}</div>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === item.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
export default Combobox;
