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
   * Callback function that is called when the user clicks on a page number.
   */
  onPageChange: (page: number) => void;
};

export default function Pagination({ mobilePagination, page, totalPages, onPageChange }: Props) {
  totalPages = Math.round(totalPages);
  const [currentPage, setCurrentPage] = useState(page);

  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage == currentPage) {
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
          <PaginationItem key="start" className="cursor-pointer">
            <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
          </PaginationItem>
          <PaginationItem key="ellipsis-start" className="cursor-pointer">
            <PaginationEllipsis />
          </PaginationItem>
        </>
      );
    }

    // Generate page numbers between startPage and endPage for desktop view
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PaginationItem key={i} className="cursor-pointer">
          <PaginationLink isActive={i === currentPage} onClick={() => handlePageChange(i)}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return pageNumbers;
  };

  return (
    <ShadCnPagination className="select-none">
      <PaginationContent>
        {/* Previous button for mobile and desktop */}
        <PaginationItem className="cursor-pointer">
          <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} />
        </PaginationItem>

        {renderPageNumbers()}

        {/* For desktop, show ellipsis and link to the last page */}
        {!mobilePagination && currentPage < totalPages && (
          <>
            <PaginationItem key="ellipsis-end">
              <PaginationEllipsis className="cursor-default" />
            </PaginationItem>
            <PaginationItem key="end" className="cursor-pointer">
              <PaginationLink onClick={() => handlePageChange(totalPages)}>{totalPages}</PaginationLink>
            </PaginationItem>
          </>
        )}

        {/* Next button for mobile and desktop */}
        <PaginationItem className="cursor-pointer">
          <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />
        </PaginationItem>
      </PaginationContent>
    </ShadCnPagination>
  );
}
