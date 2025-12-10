import { XIcon } from "lucide-react";
import { ReactNode } from "react";
import Card from "../card";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "./button";

interface FilterSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  onClear?: () => void;
  hasActiveFilters?: boolean;
  clearLabel?: string;
}

export function FilterSection({
  title,
  description,
  children,
  className,
  onClear,
  hasActiveFilters,
  clearLabel = "Clear Filters",
}: FilterSectionProps) {
  return (
    <Card className={`h-fit w-full gap-4 ${className ?? ""}`}>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-lg font-semibold">{title}</h3>
          {hasActiveFilters && onClear && (
            <SimpleTooltip display={clearLabel}>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive h-7 w-7"
                onClick={onClear}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </SimpleTooltip>
          )}
        </div>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
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
      {label && <label className="text-foreground text-sm font-medium">{label}</label>}
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
