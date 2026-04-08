"use client";

import { cn } from "@/common/utils";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import React, { useCallback } from "react";
import { useIsMobile } from "../contexts/viewport-context";
import { Button } from "./ui/button";

function formatPageLabel(page: number, useCommaSeparators: boolean): string {
  return useCommaSeparators ? formatNumberWithCommas(page) : String(page);
}

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
          "relative h-9 min-w-10 shrink-0 px-3 transition-all duration-200",
          "whitespace-nowrap",
          isButtonLoading && "cursor-not-allowed opacity-50",
          isCurrentPage && "cursor-not-allowed",
          !isActive && !isButtonLoading && "hover:shadow-xs"
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
  ariaLabel?: string;
};

const NavigationButton = React.memo(
  ({
    page: buttonPage,
    disabled,
    isLoading,
    children,
    generatePageUrl,
    onClick,
    ariaLabel,
  }: NavigationButtonProps) => (
    <Button
      asChild
      variant="ghost"
      size="icon"
      disabled={disabled || isLoading}
      className={cn(
        "shrink-0 transition-all duration-200",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && !isLoading && "hover:shadow-xs"
      )}
      aria-label={
        ariaLabel ??
        (buttonPage === 1
          ? "Go to first page"
          : buttonPage > 0
            ? `Go to page ${buttonPage}`
            : "Go to previous page")
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
  page: number;
  totalItems: number;
  itemsPerPage: number;
  loadingPage?: number;
  onPageChange: (page: number) => void;
  generatePageUrl?: (page: number) => string;
};

export default function SimplePagination({
  page,
  totalItems,
  itemsPerPage,
  loadingPage,
  onPageChange,
  generatePageUrl,
}: SimplePaginationProps) {
  const isMobile = useIsMobile();

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
    const delta = 2;
    const left = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);

    const pageNumbers: React.ReactNode[] = [];

    for (let i = left; i <= right; i++) {
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
          {formatPageLabel(i, true)}
        </PageButton>
      );
    }

    return pageNumbers;
  }, [page, totalPages, loadingState, handleLinkClick, generatePageUrl]);

  // Calculate page numbers before render to ensure consistent timing (desktop only)
  const pageNumbers = isMobile ? null : renderPageNumbers();

  return (
    <div className="flex w-full justify-center">
      <nav
        className={cn(
          "flex max-w-full min-w-0 flex-nowrap items-center justify-center",
          isMobile
            ? "w-full gap-2"
            : "gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch]"
        )}
        aria-label="Pagination navigation"
      >
        <NavigationButton
          page={1}
          disabled={page === 1}
          isLoading={loadingState.isLoading}
          onClick={handleLinkClick}
          generatePageUrl={generatePageUrl}
          ariaLabel="Go to first page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </NavigationButton>
        <NavigationButton
          page={page - 1}
          disabled={page === 1}
          isLoading={loadingState.isLoading}
          onClick={handleLinkClick}
          generatePageUrl={generatePageUrl}
        >
          <ChevronLeft className="h-4 w-4" />
        </NavigationButton>
        {isMobile ? (
          <div
            className="text-muted-foreground flex min-w-0 flex-1 items-center justify-center gap-x-1 px-0.5 text-sm tabular-nums leading-none"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="text-foreground font-medium">{formatPageLabel(page, false)}</span>
            <span className="text-muted-foreground">of</span>
            <span className="text-foreground font-medium">{formatPageLabel(totalPages, false)}</span>
          </div>
        ) : (
          pageNumbers
        )}
        <NavigationButton
          page={page + 1}
          disabled={page === totalPages}
          isLoading={loadingState.isLoading}
          onClick={handleLinkClick}
          generatePageUrl={generatePageUrl}
        >
          <ChevronRight className="h-4 w-4" />
        </NavigationButton>
        <NavigationButton
          page={totalPages}
          disabled={page === totalPages}
          isLoading={loadingState.isLoading}
          onClick={handleLinkClick}
          generatePageUrl={generatePageUrl}
          ariaLabel="Go to last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </NavigationButton>
      </nav>
    </div>
  );
}
