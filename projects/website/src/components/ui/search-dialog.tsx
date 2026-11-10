import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SharedIcons } from "@/shared-icons";
import { ReactNode } from "react";

type SearchDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  isLoading: boolean;
  children: ReactNode;
  placeholder?: string;
  maxLength?: number;
};

const SearchDialog = ({
  isOpen,
  onOpenChange,
  query,
  onQueryChange,
  isLoading,
  children,
  placeholder = "Search...",
  maxLength = 26,
}: SearchDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[600px]">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="border-border/50 bg-muted/30 relative border-b">
          <div className="flex h-14 items-center gap-3 px-4">
            {isLoading ? (
              <SharedIcons.SearchLoadingIcon className="text-muted-foreground size-4 shrink-0 animate-spin" />
            ) : (
              <SharedIcons.SearchIcon className="text-muted-foreground size-4 shrink-0" />
            )}
            <input
              className="placeholder:text-muted-foreground focus:text-foreground flex h-full w-full rounded-md bg-transparent py-3 text-sm outline-hidden transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={placeholder}
              maxLength={maxLength}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
            />
          </div>
        </div>

        <div className="[&::-webkit-scrollbar-thumb]:bg-muted/50 max-h-[500px] overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
