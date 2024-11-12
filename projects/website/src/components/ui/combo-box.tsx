"use client";

import {ReactElement, ReactNode, useEffect, useState} from "react";
import {Check, ChevronsUpDown} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {cn} from "@/common/utils";

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
};

export type ComboboxItem<T> = {
  /**
   * The value of this item.
   */
  value: T;

  /**
   * The name of this item.
   */
  name: string | ReactNode;
};

const Combobox = <T,>({
  name,
  placeholder,
  items,
  value: controlledValue,
  onValueChange,
}: ComboboxProps<T>): ReactElement => {
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
    <div className="flex flex-col gap-1.5">
      {/* Name */}
      <h1 className="text-sm font-bold">{name}</h1>

      {/* Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button className="px-2 gap-3 justify-between" variant="outline" role="combobox" aria-expanded={open}>
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
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === item.value ? "opacity-100" : "opacity-0")} />
                    <div className="flex gap-2 items-center">{item.name}</div>
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
