"use client";

import { cn } from "@/common/utils";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react";
import React, { useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const PAGES_TO_SHOW = 5;

type PaginationItemWrapperProps = {
  isLoadingPage: boolean;
  children: React.ReactNode;
};

const PaginationItemWrapper = React.memo(({ isLoadingPage, children }: PaginationItemWrapperProps) => (
  <div
    className={clsx("relative", isLoadingPage ? "cursor-not-allowed" : "cursor-pointer")}
    aria-disabled={isLoadingPage}
    tabIndex={isLoadingPage ? -1 : undefined}
  >
    {children}
  </div>
));
PaginationItemWrapper.displayName = "PaginationItemWrapper";

type PageSelectorProps = {
  totalPages: number;
  onPageSelect: (page: number) => void;
  isLoading: boolean;
};

const PageSelector = React.memo(({ totalPages, onPageSelect, isLoading }: PageSelectorProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const pageNum = parseInt(inputValue);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        onPageSelect(pageNum);
        setIsOpen(false);
        setInputValue("");
      }
    },
    [inputValue, totalPages, onPageSelect]
  );

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
      <PopoverContent className="w-48" align="center">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="space-y-1.5 text-center">
              <h4 className="leading-none font-medium">Go to Page</h4>
              <p className="text-muted-foreground text-sm">Max: {formatNumberWithCommas(totalPages)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Page..."
                className="w-full"
                autoFocus
              />
              <Button type="submit" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
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

    return (
      <Button
        asChild
        variant={isActive ? "primary" : "ghost"}
        size="sm"
        className={cn(
          "relative h-9 min-w-[2.5rem] px-2 transition-opacity duration-200",
          isButtonLoading && "cursor-not-allowed opacity-50",
          buttonPage === currentPage && "cursor-not-allowed"
        )}
      >
        <a
          href={generatePageUrl ? generatePageUrl(buttonPage) : "#"}
          onClick={e => onClick(buttonPage, e)}
          aria-disabled={isLoading || buttonPage === currentPage}
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
      className={cn("transition-opacity duration-200", disabled && "cursor-not-allowed opacity-50")}
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
  const loadingState = isLoading ? { isLoading: true, loadingPage } : { isLoading: false, loadingPage: undefined };

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

    const maxPagesToShow = PAGES_TO_SHOW;
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
          <PageSelector key="ellipsis-end" totalPages={totalPages} onPageSelect={handlePageChange} isLoading={false} />
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
        <div className={cn("text-muted-foreground text-sm select-none", !statsBelow && "left-0 lg:absolute")}>
          <p>
            {formatNumberWithCommas(Math.min((page - 1) * itemsPerPage + 1, totalItems))} -{" "}
            {formatNumberWithCommas(Math.min(page * itemsPerPage, totalItems))} / {formatNumberWithCommas(totalItems)}
          </p>
        </div>
      )}

      {/* Pagination Buttons */}
      <div className="flex items-center gap-1">
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
      </div>
    </div>
  );
}
