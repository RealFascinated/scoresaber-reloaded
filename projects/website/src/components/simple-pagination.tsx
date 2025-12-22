"use client";

import { cn } from "@/common/utils";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react";
import React, { useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type PageSelectorProps = {
  totalPages: number;
  onPageSelect: (page: number) => void;
  isLoading: boolean;
};

const PageSelector = React.memo(({ totalPages, onPageSelect, isLoading }: PageSelectorProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedValue = inputValue.trim();
      if (!trimmedValue) {
        setError("Please enter a page number");
        return;
      }
      const pageNum = Number(trimmedValue);
      if (!Number.isInteger(pageNum) || isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
        setError(`Please enter a number between 1 and ${formatNumberWithCommas(totalPages)}`);
        return;
      }
      setError("");
      onPageSelect(pageNum);
      setIsOpen(false);
      setInputValue("");
    },
    [inputValue, totalPages, onPageSelect]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError("");
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={isLoading}>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Select page"
          disabled={isLoading}
          className="transition-opacity duration-200"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="center">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="space-y-1.5 text-center">
              <h4 className="leading-none font-medium">Go to Page</h4>
              <p className="text-muted-foreground text-sm">Max: {formatNumberWithCommas(totalPages)}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={`1-${formatNumberWithCommas(totalPages)}`}
                  className={cn("w-full", error && "border-destructive")}
                  autoFocus
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "page-error" : undefined}
                />
                <Button type="submit" size="icon" className="shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {error && (
                <p id="page-error" className="text-destructive text-center text-xs">
                  {error}
                </p>
              )}
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
});
PageSelector.displayName = "PageSelector";

type PageButtonProps = {
  page: number;
  currentPage: number;
  loadingPage?: number;
  isLoading: boolean;
  isActive?: boolean;
  children: React.ReactNode;
  generatePageUrl?: (page: number) => string;
  onClick: (page: number, event: React.MouseEvent) => void;
};

const PageButton = React.memo(
  ({
    page: buttonPage,
    currentPage,
    loadingPage,
    isLoading,
    isActive,
    children,
    generatePageUrl,
    onClick,
  }: PageButtonProps) => {
    const isButtonLoading = loadingPage === buttonPage;
    const isCurrentPage = buttonPage === currentPage;

    return (
      <Button
        asChild
        variant={isActive ? "primary" : "ghost"}
        size="sm"
        className={cn(
          "relative h-9 min-w-10 px-3 transition-all duration-200",
          "whitespace-nowrap",
          isButtonLoading && "cursor-not-allowed opacity-50",
          isCurrentPage && "cursor-not-allowed",
          !isActive && !isButtonLoading && "hover:shadow-sm"
        )}
        aria-current={isCurrentPage ? "page" : undefined}
      >
        <a
          href={generatePageUrl ? generatePageUrl(buttonPage) : "#"}
          onClick={e => onClick(buttonPage, e)}
          aria-disabled={isLoading || isCurrentPage}
          aria-label={`Go to page ${buttonPage}`}
          className="flex items-center justify-center"
        >
          <span className={cn(isButtonLoading && "blur-[2px]")}>{children}</span>
          {isButtonLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            </div>
          )}
        </a>
      </Button>
    );
  }
);
PageButton.displayName = "PageButton";

type NavigationButtonProps = {
  page: number;
  disabled: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  generatePageUrl?: (page: number) => string;
  onClick: (page: number, event: React.MouseEvent) => void;
};

const NavigationButton = React.memo(
  ({ page: buttonPage, disabled, isLoading, children, generatePageUrl, onClick }: NavigationButtonProps) => (
    <Button
      asChild
      variant="ghost"
      size="icon"
      disabled={disabled || isLoading}
      className={cn(
        "transition-all duration-200",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && !isLoading && "hover:shadow-sm"
      )}
      aria-label={
        buttonPage === 1
          ? "Go to first page"
          : buttonPage > 0
            ? `Go to page ${buttonPage}`
            : "Go to previous page"
      }
    >
      <a
        href={generatePageUrl ? generatePageUrl(buttonPage) : "#"}
        onClick={e => onClick(buttonPage, e)}
        aria-disabled={disabled || isLoading}
      >
        {children}
      </a>
    </Button>
  )
);
NavigationButton.displayName = "NavigationButton";

export type SimplePaginationProps = {
  mobilePagination?: boolean;
  page: number;
  totalItems: number;
  itemsPerPage: number;
  loadingPage?: number;
  statsBelow?: boolean;
  showStats?: boolean;
  onPageChange: (page: number) => void;
  generatePageUrl?: (page: number) => string;
};

export default function SimplePagination({
  mobilePagination,
  page,
  totalItems,
  itemsPerPage,
  statsBelow,
  showStats = true,
  loadingPage,
  onPageChange,
  generatePageUrl,
}: SimplePaginationProps) {
  page = page == 0 ? 1 : page;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Calculate loading state once and ensure it's consistent
  const isLoading = Boolean(loadingPage);
  const loadingState = isLoading
    ? { isLoading: true, loadingPage }
    : { isLoading: false, loadingPage: undefined };

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

  const renderPageNumbers = useCallback(() => {
    if (mobilePagination) return [];

    const maxPagesToShow = page > 999 ? 3 : 5;
    const pageNumbers = [];

    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (totalPages > maxPagesToShow && endPage - startPage + 1 < maxPagesToShow) {
      startPage = endPage - maxPagesToShow + 1;
    }

    if (startPage > 1) {
      pageNumbers.push(
        <PageButton
          key="start"
          page={1}
          currentPage={page}
          isLoading={loadingState.isLoading}
          onClick={handleLinkClick}
          generatePageUrl={generatePageUrl}
          loadingPage={loadingState.loadingPage}
        >
          1
        </PageButton>
      );
      if (startPage > 2)
        pageNumbers.push(
          <PageSelector
            key="ellipsis-start"
            totalPages={totalPages}
            onPageSelect={handlePageChange}
            isLoading={false}
          />
        );
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PageButton
          key={`page-${i}`}
          page={i}
          isActive={i === page}
          currentPage={page}
          isLoading={loadingState.isLoading}
          onClick={handleLinkClick}
          generatePageUrl={generatePageUrl}
          loadingPage={loadingState.loadingPage}
        >
          {formatNumberWithCommas(i)}
        </PageButton>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1)
        pageNumbers.push(
          <PageSelector
            key="ellipsis-end"
            totalPages={totalPages}
            onPageSelect={handlePageChange}
            isLoading={false}
          />
        );
      pageNumbers.push(
        <PageButton
          key="end"
          page={totalPages}
          currentPage={page}
          isLoading={loadingState.isLoading}
          onClick={handleLinkClick}
          generatePageUrl={generatePageUrl}
          loadingPage={loadingState.loadingPage}
        >
          {formatNumberWithCommas(totalPages)}
        </PageButton>
      );
    }

    return pageNumbers;
  }, [mobilePagination, page, totalPages, loadingState, handleLinkClick, generatePageUrl, handlePageChange]);

  // Calculate page numbers before render to ensure consistent timing
  const pageNumbers = renderPageNumbers();

  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-between lg:justify-center",
        statsBelow && "flex-col-reverse gap-2"
      )}
    >
      {/* Pagination Info */}
      {showStats && (
        <div
          className={cn(
            "text-muted-foreground text-sm transition-opacity duration-200 select-none",
            !statsBelow && "left-0 lg:absolute"
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          <p>
            <span className="text-foreground font-medium">
              {formatNumberWithCommas(Math.min((page - 1) * itemsPerPage + 1, totalItems))}
            </span>{" "}
            to{" "}
            <span className="text-foreground font-medium">
              {formatNumberWithCommas(Math.min(page * itemsPerPage, totalItems))}
            </span>{" "}
            of <span className="text-foreground font-medium">{formatNumberWithCommas(totalItems)}</span>
          </p>
        </div>
      )}

      {/* Pagination Buttons */}
      <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination navigation">
        {mobilePagination && (
          <NavigationButton
            page={1}
            disabled={page === 1}
            isLoading={loadingState.isLoading}
            onClick={handleLinkClick}
            generatePageUrl={generatePageUrl}
          >
            <ChevronsLeft className="h-4 w-4" />
          </NavigationButton>
        )}
        <NavigationButton
          page={page - 1}
          disabled={page === 1}
          isLoading={loadingState.isLoading}
          onClick={handleLinkClick}
          generatePageUrl={generatePageUrl}
        >
          <ChevronLeft className="h-4 w-4" />
        </NavigationButton>
        {pageNumbers}
        <NavigationButton
          page={page + 1}
          disabled={page === totalPages}
          isLoading={loadingState.isLoading}
          onClick={handleLinkClick}
          generatePageUrl={generatePageUrl}
        >
          <ChevronRight className="h-4 w-4" />
        </NavigationButton>
        {mobilePagination && (
          <NavigationButton
            page={totalPages}
            disabled={page === totalPages}
            isLoading={loadingState.isLoading}
            onClick={handleLinkClick}
            generatePageUrl={generatePageUrl}
          >
            <ChevronsRight className="h-4 w-4" />
          </NavigationButton>
        )}
      </nav>
    </div>
  );
}
