import { cn } from "@/common/utils";
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from "@heroicons/react/16/solid";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import React, { useEffect, useState } from "react";
import {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Pagination as ShadCnPagination,
} from "../ui/pagination";

type PaginationItemWrapperProps = {
  isLoadingPage: boolean;
  children: React.ReactNode;
};

const PaginationItemWrapper = ({ isLoadingPage, children }: PaginationItemWrapperProps) => (
  <PaginationItem
    className={clsx(isLoadingPage ? "cursor-not-allowed" : "cursor-pointer")}
    aria-disabled={isLoadingPage}
    tabIndex={isLoadingPage ? -1 : undefined}
  >
    {children}
  </PaginationItem>
);

type Props = {
  mobilePagination: boolean;
  page: number;
  totalItems: number;
  itemsPerPage: number;
  loadingPage?: number;
  statsBelow?: boolean;
  onPageChange: (page: number) => void;
  generatePageUrl?: (page: number) => string;
};

export default function Pagination({
  mobilePagination,
  page,
  totalItems,
  itemsPerPage,
  statsBelow,
  loadingPage,
  onPageChange,
  generatePageUrl,
}: Props) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isLoading = loadingPage !== undefined;
  const [currentPage, setCurrentPage] = useState(page);

  useEffect(() => setCurrentPage(page), [page]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage && !isLoading) {
      setCurrentPage(newPage);
      onPageChange(newPage);
    }
  };

  const handleLinkClick = (newPage: number, event: React.MouseEvent) => {
    event.preventDefault();
    handlePageChange(newPage);
  };

  const renderPageNumbers = () => {
    if (mobilePagination) return [];

    const maxPagesToShow = mobilePagination ? 3 : 4;
    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    const pageNumbers = [];

    if (startPage > 1) {
      pageNumbers.push(
        <PaginationItemWrapper key="start" isLoadingPage={isLoading}>
          <PaginationLink href={generatePageUrl?.(1) || ""} onClick={e => handleLinkClick(1, e)}>
            1
          </PaginationLink>
        </PaginationItemWrapper>
      );
      if (startPage > 2)
        pageNumbers.push(
          <PaginationItemWrapper key="ellipsis-start" isLoadingPage={isLoading}>
            <PaginationEllipsis />
          </PaginationItemWrapper>
        );
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PaginationItemWrapper key={`page-${i}`} isLoadingPage={isLoading}>
          <PaginationLink
            isActive={i === currentPage}
            href={generatePageUrl?.(i) || ""}
            onClick={e => handleLinkClick(i, e)}
          >
            {loadingPage === i ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : i}
          </PaginationLink>
        </PaginationItemWrapper>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1)
        pageNumbers.push(
          <PaginationItemWrapper key="ellipsis-end" isLoadingPage={isLoading}>
            <PaginationEllipsis />
          </PaginationItemWrapper>
        );
      pageNumbers.push(
        <PaginationItemWrapper key="end" isLoadingPage={isLoading}>
          <PaginationLink
            href={generatePageUrl?.(totalPages) || ""}
            onClick={e => handleLinkClick(totalPages, e)}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItemWrapper>
      );
    }

    return pageNumbers;
  };

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between lg:justify-center relative",
        statsBelow && "flex-col-reverse gap-2"
      )}
    >
      {/* Pagination Info */}
      <div className={cn("text-sm", !statsBelow && "lg:absolute left-0")}>
        <p>
          {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} -{" "}
          {Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems}
        </p>
      </div>

      {/* Pagination Buttons */}
      <ShadCnPagination className="select-none">
        <PaginationContent>
          {mobilePagination && (
            <PaginationItemWrapper key="mobile-start" isLoadingPage={isLoading}>
              <PaginationLink
                href={generatePageUrl?.(1) || ""}
                onClick={e => handleLinkClick(1, e)}
                className={clsx(currentPage === 1 && "cursor-not-allowed")}
              >
                <ChevronDoubleLeftIcon className="h-4 w-4" />
              </PaginationLink>
            </PaginationItemWrapper>
          )}
          <PaginationItemWrapper key="previous" isLoadingPage={isLoading}>
            <PaginationPrevious
              href={currentPage > 1 ? generatePageUrl?.(currentPage - 1) || "" : ""}
              onClick={e => handleLinkClick(currentPage - 1, e)}
              aria-disabled={currentPage === 1}
              className={clsx(currentPage === 1 && "cursor-not-allowed", "p-3")}
            />
          </PaginationItemWrapper>
          {renderPageNumbers()}
          <PaginationItemWrapper key="next" isLoadingPage={isLoading}>
            <PaginationNext
              href={currentPage < totalPages ? generatePageUrl?.(currentPage + 1) || "" : ""}
              onClick={e => handleLinkClick(currentPage + 1, e)}
              aria-disabled={currentPage === totalPages}
              className={clsx(currentPage === totalPages && "cursor-not-allowed", "p-3")}
            />
          </PaginationItemWrapper>
          {mobilePagination && (
            <PaginationItemWrapper key="mobile-end" isLoadingPage={isLoading}>
              <PaginationLink
                href={generatePageUrl?.(totalPages) || ""}
                onClick={e => handleLinkClick(totalPages, e)}
                className={clsx(currentPage === totalPages && "cursor-not-allowed")}
              >
                <ChevronDoubleRightIcon className="h-4 w-4" />
              </PaginationLink>
            </PaginationItemWrapper>
          )}
        </PaginationContent>
      </ShadCnPagination>
    </div>
  );
}
