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
      <DialogContent className="gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="relative">
          <div className="border-border/50 flex h-12 items-center gap-2 border-b px-4">
            <Search className="size-4 shrink-0 opacity-50" />
            <input
              className="placeholder:text-muted-foreground flex h-2 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={placeholder}
              maxLength={maxLength}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
            />
            {isLoading && (
              <LoaderCircle className="absolute inset-y-0 right-12 size-5 h-full animate-spin opacity-85" />
            )}
          </div>
        </div>

        <div className="[&::-webkit-scrollbar-thumb]:bg-muted max-h-[400px] overflow-y-auto overflow-x-hidden pb-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
