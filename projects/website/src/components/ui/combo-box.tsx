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
import { ChevronsUpDown } from "lucide-react";
import { ReactElement, ReactNode, useId, useState } from "react";

/**
 * The props for this combobox.
 */
type ComboboxProps<T> = {
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
   * The display name for the button (simplified version of name).
   */
  displayName?: string;

  /**
   * The class name of this item.
   */
  className?: string;
};

const Combobox = <T,>({
  placeholder,
  items,
  value: controlledValue,
  onValueChange,
  className,
}: ComboboxProps<T>): ReactElement<any> => {
  const [open, setOpen] = useState<boolean>(false);
  const [internalValue, setInternalValue] = useState<T | undefined>(() => controlledValue);
  const listId = useId();

  // Derive value during render: controlled when prop provided, otherwise internal
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (newValue: T | undefined) => {
    setInternalValue(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <div className={cn("flex flex-col gap-(--spacing-md)", className)}>
      {/* Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            className="h-10 justify-between gap-(--spacing-lg) px-(--spacing-sm)"
            variant="outline"
            size="lg"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
          >
            <span className="truncate">
              {value
                ? items.find(item => item.value === value)?.displayName ||
                  items.find(item => item.value === value)?.name
                : placeholder || "None"}
            </span>
            <ChevronsUpDown className="ml-2 size-5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-fit p-0">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList id={listId}>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {items.map((item, index) => {
                  const searchValue =
                    typeof item.displayName === "string"
                      ? item.displayName
                      : typeof item.name === "string"
                        ? item.name
                        : String(item.value);
                  return (
                    <CommandItem
                      key={String(item.value) + (typeof item.name === "string" ? `-${item.name}` : `-${index}`)}
                      value={searchValue}
                      onSelect={() => {
                        setOpen(false);
                        handleValueChange(item.value === value ? undefined : item.value);
                      }}
                      className={cn("flex items-center justify-between", item.className)}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-(--spacing-sm)">
                        {item.icon}
                        {typeof item.name === "string" ? <span>{item.name}</span> : item.name}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
export default Combobox;
