"use client";

import SimplePagination from "@/components/simple-pagination";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type RankedBatchPaginationProps = {
  page: number;
  totalItems: number;
  itemsPerPage: number;
};

function buildPageUrl(page: number): string {
  return page > 1 ? `/ranked-batches?page=${page}` : "/ranked-batches";
}

/**
 * Pagination for the server rendered ranked batches list; each page is a navigation.
 */
export function RankedBatchPagination({ page, totalItems, itemsPerPage }: RankedBatchPaginationProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <SimplePagination
      page={page}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      loadingPage={isPending ? page : undefined}
      generatePageUrl={buildPageUrl}
      onPageChange={newPage => startTransition(() => router.push(buildPageUrl(newPage)))}
    />
  );
}
