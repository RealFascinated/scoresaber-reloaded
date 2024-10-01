import { ArrowPathIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
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

type PaginationItemWrapperProps = {
  /**
   * Whether a page is currently loading.
   */
  isLoadingPage: boolean;

  /**
   * The children to render.
   */
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

  /**
   * Optional callback to generate the URL for each page.
   */
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
    event.preventDefault(); // Prevent default navigation behavior
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

    // Show "Jump to Start" with Ellipsis if currentPage is greater than 3 in desktop view
    if (startPage > 1 && !mobilePagination) {
      pageNumbers.push(
        <>
          <PaginationItemWrapper key="start" isLoadingPage={isLoading}>
            <PaginationLink href={generatePageUrl ? generatePageUrl(1) : ""} onClick={e => handleLinkClick(1, e)}>
              1
            </PaginationLink>
          </PaginationItemWrapper>
          {/* Only show ellipsis if more than 2 pages from the start */}
          {startPage > 2 && (
            <PaginationItemWrapper key="ellipsis-start" isLoadingPage={isLoading}>
              <PaginationEllipsis />
            </PaginationItemWrapper>
          )}
        </>
      );
    }

    // Generate page numbers between startPage and endPage for desktop view
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PaginationItemWrapper key={i} isLoadingPage={isLoading}>
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
        {/* Previous button for mobile and desktop */}
        <PaginationItemWrapper isLoadingPage={isLoading}>
          <PaginationPrevious
            href={generatePageUrl ? generatePageUrl(currentPage - 1) : ""}
            onClick={e => handleLinkClick(currentPage - 1, e)}
          />
        </PaginationItemWrapper>

        {renderPageNumbers()}

        {/* For desktop, show ellipsis and link to the last page */}
        {!mobilePagination && currentPage < totalPages && totalPages - currentPage > 2 && (
          <>
            <PaginationItemWrapper key="ellipsis-end" isLoadingPage={isLoading}>
              <PaginationEllipsis className="cursor-default" />
            </PaginationItemWrapper>
            <PaginationItemWrapper key="end" isLoadingPage={isLoading}>
              <PaginationLink
                href={generatePageUrl ? generatePageUrl(totalPages) : ""}
                onClick={e => handleLinkClick(totalPages, e)}
              >
                {totalPages}
              </PaginationLink>
            </PaginationItemWrapper>
          </>
        )}

        {/* Next button for mobile and desktop */}
        <PaginationItemWrapper isLoadingPage={isLoading}>
          <PaginationNext
            href={generatePageUrl ? generatePageUrl(currentPage + 1) : ""}
            onClick={e => handleLinkClick(currentPage + 1, e)}
          />
        </PaginationItemWrapper>
      </PaginationContent>
    </ShadCnPagination>
  );
}
