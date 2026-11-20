import { SharedIcons } from "@/shared-icons";
import { ReactNode } from "react";
import Card from "../card";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "./button";

interface FilterSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  onClear?: () => void;
  hasActiveFilters?: boolean;
  clearLabel?: string;
}

export function FilterSection({
  title,
  children,
  className,
  onClear,
  hasActiveFilters,
  clearLabel = "Clear Filters",
}: FilterSectionProps) {
  return (
    <Card className={`h-fit w-full gap-4 ${className ?? ""}`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {hasActiveFilters && onClear && (
            <SimpleTooltip display={clearLabel}>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={onClear}
              >
                <SharedIcons.FilterClearIcon className="size-4" />
              </Button>
            </SimpleTooltip>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}

interface FilterFieldProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      {children}
    </div>
  );
}

interface FilterRowProps {
  children: ReactNode;
  className?: string;
}

export function FilterRow({ children, className }: FilterRowProps) {
  return <div className={`flex flex-row items-center gap-2 ${className ?? ""}`}>{children}</div>;
}
