import { ArrowPathIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { useEffect, useState } from "react";
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

function PaginationItemWrapper({ isLoadingPage, children }: PaginationItemWrapperProps) {
  return (
    <PaginationItem className={clsx(isLoadingPage ? "cursor-not-allowed" : "cursor-pointer")}>
      {children}
    </PaginationItem>
  );
}

type Props = {
  /**
   * If true, the pagination will be rendered as a mobile-friendly pagination.
   */
  mobilePagination: boolean;

  /**
   * The current page.
   */
  page: number;

  /**
   * The total number of pages.
   */
  totalPages: number;

  /**
   * The page to show a loading icon on.
   */
  loadingPage: number | undefined;

  /**
   * Callback function that is called when the user clicks on a page number.
   */
  onPageChange: (page: number) => void;
};

export default function Pagination({ mobilePagination, page, totalPages, loadingPage, onPageChange }: Props) {
  totalPages = Math.round(totalPages);
  const isLoading = loadingPage !== undefined;
  const [currentPage, setCurrentPage] = useState(page);

  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage == currentPage || isLoading) {
      return;
    }

    setCurrentPage(newPage);
    onPageChange(newPage);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = mobilePagination ? 3 : 4;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // Show "Jump to Start" with Ellipsis if currentPage is greater than 3 in desktop view
    if (startPage > 1 && !mobilePagination) {
      pageNumbers.push(
        <>
          <PaginationItemWrapper key="start" isLoadingPage={isLoading}>
            <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
          </PaginationItemWrapper>
          <PaginationItemWrapper key="ellipsis-start" isLoadingPage={isLoading}>
            <PaginationEllipsis />
          </PaginationItemWrapper>
        </>
      );
    }

    // Generate page numbers between startPage and endPage for desktop view
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PaginationItemWrapper key={i} isLoadingPage={isLoading}>
          <PaginationLink isActive={i === currentPage} onClick={() => handlePageChange(i)}>
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
        {/* Previous button for mobile and desktop */}
        <PaginationItemWrapper isLoadingPage={isLoading}>
          <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} />
        </PaginationItemWrapper>

        {renderPageNumbers()}

        {/* For desktop, show ellipsis and link to the last page */}
        {!mobilePagination && currentPage < totalPages && (
          <>
            <PaginationItemWrapper key="ellipsis-end" isLoadingPage={isLoading}>
              <PaginationEllipsis className="cursor-default" />
            </PaginationItemWrapper>
            <PaginationItemWrapper key="end" isLoadingPage={isLoading}>
              <PaginationLink onClick={() => handlePageChange(totalPages)}>{totalPages}</PaginationLink>
            </PaginationItemWrapper>
          </>
        )}

        {/* Next button for mobile and desktop */}
        <PaginationItemWrapper isLoadingPage={isLoading}>
          <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />
        </PaginationItemWrapper>
      </PaginationContent>
    </ShadCnPagination>
  );
}
