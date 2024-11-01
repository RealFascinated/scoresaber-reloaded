import { ArrowPathIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import * as React from "react";
import { useEffect, useState } from "react";
import {
  Pagination as ShadCnPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from "@heroicons/react/16/solid";

type PaginationItemWrapperProps = {
  isLoadingPage: boolean;
  children: React.ReactNode;
};

function PaginationItemWrapper({ isLoadingPage, children }: PaginationItemWrapperProps) {
  return (
    <PaginationItem
      className={clsx(isLoadingPage ? "cursor-not-allowed" : "cursor-pointer")}
      aria-disabled={isLoadingPage}
      tabIndex={isLoadingPage ? -1 : undefined}
    >
      {children}
    </PaginationItem>
  );
}

type Props = {
  mobilePagination: boolean;
  page: number;
  totalPages: number;
  loadingPage: number | undefined;
  onPageChange: (page: number) => void;
  generatePageUrl?: (page: number) => string;
};

export default function Pagination({
  mobilePagination,
  page,
  totalPages,
  loadingPage,
  onPageChange,
  generatePageUrl,
}: Props) {
  totalPages = Math.round(totalPages);
  const isLoading = loadingPage !== undefined;
  const [currentPage, setCurrentPage] = useState(page);

  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || isLoading) {
      return;
    }
    setCurrentPage(newPage);
    onPageChange(newPage);
  };

  const handleLinkClick = (newPage: number, event: React.MouseEvent) => {
    event.preventDefault();
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || isLoading) {
      return;
    }
    handlePageChange(newPage);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = mobilePagination ? 3 : 4;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pageNumbers.push(
        <PaginationItemWrapper key={`start-1`} isLoadingPage={isLoading}>
          {!mobilePagination && (
            <PaginationLink href={generatePageUrl ? generatePageUrl(1) : ""} onClick={e => handleLinkClick(1, e)}>
              1
            </PaginationLink>
          )}
        </PaginationItemWrapper>
      );
      if (startPage > 2 && !mobilePagination) {
        pageNumbers.push(
          <PaginationItemWrapper key={`ellipsis-start`} isLoadingPage={isLoading}>
            <PaginationEllipsis />
          </PaginationItemWrapper>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PaginationItemWrapper key={`page-${i}`} isLoadingPage={isLoading}>
          <PaginationLink
            isActive={i === currentPage}
            href={generatePageUrl ? generatePageUrl(i) : ""}
            onClick={e => handleLinkClick(i, e)}
          >
            {loadingPage === i ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : i}
          </PaginationLink>
        </PaginationItemWrapper>
      );
    }

    return pageNumbers;
  };

  return (
    <ShadCnPagination className="select-none">
      <PaginationContent>
        {mobilePagination && (
          <PaginationItemWrapper key={`mobile-start`} isLoadingPage={isLoading}>
            <PaginationLink href={generatePageUrl ? generatePageUrl(1) : ""} onClick={e => handleLinkClick(1, e)}>
              <ChevronDoubleLeftIcon className="h-4 w-4" />
            </PaginationLink>
          </PaginationItemWrapper>
        )}

        <PaginationItemWrapper key={`previous`} isLoadingPage={isLoading}>
          <PaginationPrevious
            href={currentPage > 1 && generatePageUrl ? generatePageUrl(currentPage - 1) : ""}
            onClick={e => handleLinkClick(currentPage - 1, e)}
            aria-disabled={currentPage === 1}
            className={clsx(currentPage === 1 && "cursor-not-allowed")}
          />
        </PaginationItemWrapper>

        {renderPageNumbers()}

        {!mobilePagination && currentPage < totalPages && totalPages - currentPage > 2 && (
          <>
            <PaginationItemWrapper key={`ellipsis-end`} isLoadingPage={isLoading}>
              <PaginationEllipsis />
            </PaginationItemWrapper>
            <PaginationItemWrapper key={`end`} isLoadingPage={isLoading}>
              <PaginationLink
                href={generatePageUrl ? generatePageUrl(totalPages) : ""}
                onClick={e => handleLinkClick(totalPages, e)}
              >
                {totalPages}
              </PaginationLink>
            </PaginationItemWrapper>
          </>
        )}

        <PaginationItemWrapper key={`next`} isLoadingPage={isLoading}>
          <PaginationNext
            href={currentPage < totalPages && generatePageUrl ? generatePageUrl(currentPage + 1) : ""}
            onClick={e => handleLinkClick(currentPage + 1, e)}
            aria-disabled={currentPage === totalPages}
            className={clsx(currentPage === totalPages && "cursor-not-allowed")}
          />
        </PaginationItemWrapper>

        {mobilePagination && (
          <PaginationItemWrapper key={`mobile-end`} isLoadingPage={isLoading}>
            <PaginationLink
              href={generatePageUrl ? generatePageUrl(totalPages) : ""}
              onClick={e => handleLinkClick(totalPages, e)}
            >
              <ChevronDoubleRightIcon className="h-4 w-4" />
            </PaginationLink>
          </PaginationItemWrapper>
        )}
      </PaginationContent>
    </ShadCnPagination>
  );
}
