import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LoaderCircle, Search } from "lucide-react";
import { ReactNode } from "react";

type SearchDialogProps = {
  /**
   * Whether the search dialog is open.
   */
  isOpen: boolean;
  /**
   * Callback for when the search dialog open state changes.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * The current search query.
   */
  query: string;
  /**
   * Callback for when the search query changes.
   */
  onQueryChange: (query: string) => void;
  /**
   * Whether the search is currently loading.
   */
  isLoading: boolean;
  /**
   * The content to display in the search results.
   */
  children: ReactNode;
  /**
   * Placeholder text for the search input.
   */
  placeholder?: string;
  /**
   * Maximum length for the search input.
   */
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
              <LoaderCircle className="text-muted-foreground size-4 shrink-0 animate-spin" />
            ) : (
              <Search className="text-muted-foreground size-4 shrink-0" />
            )}
            <input
              className="placeholder:text-muted-foreground focus:text-foreground flex h-full w-full rounded-md bg-transparent py-3 text-sm transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
