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
import { ChevronsUpDown, X } from "lucide-react";
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

  /**
   * When true, show a button to clear the current value (calls onValueChange with undefined).
   */
  clearable?: boolean;
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
  clearable = false,
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

  const selectedItem = value != null ? items.find(item => item.value === value) : undefined;
  const triggerLabel =
    selectedItem != null
      ? (selectedItem.displayName ??
        (typeof selectedItem.name === "string" ? selectedItem.name : String(selectedItem.value)))
      : (placeholder ?? "None");
  const showClear = Boolean(clearable && value != null && onValueChange);

  return (
    <div className={cn("flex w-full min-w-0 items-stretch gap-1.5", className)}>
      <div className="min-w-0 flex-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              className={cn(
                "border-border/70 bg-muted/40 hover:bg-muted/55 h-10 w-full min-w-0 justify-between gap-2 rounded-lg px-3 font-normal shadow-none hover:shadow-xs",
                "data-[state=open]:border-primary/40 data-[state=open]:bg-muted/50"
              )}
              variant="outline"
              size="lg"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
                {selectedItem?.icon ? (
                  <span className="text-muted-foreground flex shrink-0 items-center">
                    {selectedItem.icon}
                  </span>
                ) : null}
                <span className="truncate">{triggerLabel}</span>
              </span>
              <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 opacity-70" />
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
                        key={
                          String(item.value) + (typeof item.name === "string" ? `-${item.name}` : `-${index}`)
                        }
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
      {showClear ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="border-border/70 bg-muted/40 hover:bg-muted/55 size-10 shrink-0 shadow-none"
          aria-label="Clear selection"
          onClick={() => handleValueChange(undefined)}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
};
export default Combobox;
