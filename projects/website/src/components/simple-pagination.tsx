import { cn } from "@/common/utils";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import clsx from "clsx";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import React, { useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type PaginationItemWrapperProps = {
  isLoadingPage: boolean;
  children: React.ReactNode;
};

const PaginationItemWrapper = React.memo(
  ({ isLoadingPage, children }: PaginationItemWrapperProps) => (
    <div
      className={clsx("relative", isLoadingPage ? "cursor-not-allowed" : "cursor-pointer")}
      aria-disabled={isLoadingPage}
      tabIndex={isLoadingPage ? -1 : undefined}
    >
      {children}
    </div>
  )
);
PaginationItemWrapper.displayName = "PaginationItemWrapper";

type Props = {
  mobilePagination?: boolean;
  page: number;
  totalItems: number;
  itemsPerPage: number;
  loadingPage?: number;
  statsBelow?: boolean;
  onPageChange: (page: number) => void;
  generatePageUrl?: (page: number) => string;
};

export default function SimplePagination({
  mobilePagination,
  page,
  totalItems,
  itemsPerPage,
  statsBelow,
  loadingPage,
  onPageChange,
  generatePageUrl,
}: Props) {
  page = page == 0 ? 1 : page;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isLoading = loadingPage !== undefined;

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages && newPage !== page && !isLoading) {
        onPageChange(newPage);
      }
    },
    [page, totalPages, isLoading, onPageChange]
  );

  const handleLinkClick = useCallback(
    (newPage: number, event: React.MouseEvent) => {
      event.preventDefault();
      handlePageChange(newPage);
    },
    [handlePageChange]
  );

  const PageSelector = React.memo(() => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const handleSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        const pageNum = parseInt(inputValue);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          handlePageChange(pageNum);
          setIsOpen(false);
          setInputValue("");
        }
      },
      [inputValue, totalPages, handlePageChange]
    );

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer"
            aria-label="Select page"
          >
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="center">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={`Page (1-${totalPages})`}
                className="w-full"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Go
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    );
  });
  PageSelector.displayName = "PageSelector";

  const PageButton = React.memo(
    ({
      page: buttonPage,
      isActive,
      children,
    }: {
      page: number;
      isActive?: boolean;
      children: React.ReactNode;
    }) => (
      <button
        onClick={e => handleLinkClick(buttonPage, e)}
        disabled={isLoading || buttonPage === page}
        className={cn(
          "relative h-8 min-w-[2rem] px-2 flex items-center justify-center rounded-md text-sm transition-all cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground font-medium shadow-sm"
            : "hover:bg-accent hover:text-accent-foreground",
          isLoading && "cursor-not-allowed opacity-50"
        )}
      >
        {loadingPage === buttonPage ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : children}
      </button>
    )
  );
  PageButton.displayName = "PageButton";

  const NavigationButton = React.memo(
    ({
      page: buttonPage,
      disabled,
      children,
    }: {
      page: number;
      disabled: boolean;
      children: React.ReactNode;
    }) => (
      <button
        onClick={e => handleLinkClick(buttonPage, e)}
        disabled={disabled || isLoading}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-md transition-all cursor-pointer",
          !disabled && "hover:bg-accent hover:text-accent-foreground",
          (disabled || isLoading) && "cursor-not-allowed opacity-50"
        )}
      >
        {children}
      </button>
    )
  );
  NavigationButton.displayName = "NavigationButton";

  const renderPageNumbers = useCallback(() => {
    if (mobilePagination) return [];

    const maxPagesToShow = 3;
    const startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    const pageNumbers = [];

    if (startPage > 1) {
      pageNumbers.push(
        <PageButton key="start" page={1}>
          1
        </PageButton>
      );
      if (startPage > 2)
        pageNumbers.push(
          <PaginationItemWrapper key="ellipsis-start" isLoadingPage={isLoading}>
            <PageSelector />
          </PaginationItemWrapper>
        );
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PageButton key={`page-${i}`} page={i} isActive={i === page}>
          {formatNumberWithCommas(i)}
        </PageButton>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1)
        pageNumbers.push(
          <PaginationItemWrapper key="ellipsis-end" isLoadingPage={isLoading}>
            <PageSelector />
          </PaginationItemWrapper>
        );
      pageNumbers.push(
        <PageButton key="end" page={totalPages}>
          {totalPages}
        </PageButton>
      );
    }

    return pageNumbers;
  }, [mobilePagination, page, totalPages, isLoading]);

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between lg:justify-center relative",
        statsBelow && "flex-col-reverse gap-2"
      )}
    >
      {/* Pagination Info */}
      <div
        className={cn(
          "text-sm select-none text-muted-foreground",
          !statsBelow && "lg:absolute left-0"
        )}
      >
        <p>
          {formatNumberWithCommas(Math.min((page - 1) * itemsPerPage + 1, totalItems))} -{" "}
          {formatNumberWithCommas(Math.min(page * itemsPerPage, totalItems))} /{" "}
          {formatNumberWithCommas(totalItems)}
        </p>
      </div>

      {/* Pagination Buttons */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
        {mobilePagination && (
          <NavigationButton page={1} disabled={page === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </NavigationButton>
        )}
        <NavigationButton page={page - 1} disabled={page === 1}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </NavigationButton>
        {renderPageNumbers()}
        <NavigationButton page={page + 1} disabled={page === totalPages}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </NavigationButton>
        {mobilePagination && (
          <NavigationButton page={totalPages} disabled={page === totalPages}>
            <ChevronsRight className="h-4 w-4" />
          </NavigationButton>
        )}
      </div>
    </div>
  );
}
