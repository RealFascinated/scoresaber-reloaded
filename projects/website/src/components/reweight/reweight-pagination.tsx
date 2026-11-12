"use client";

import SimplePagination from "@/components/simple-pagination";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type ReweightPaginationProps = {
  page: number;
  totalItems: number;
  itemsPerPage: number;
};

function buildPageUrl(page: number): string {
  return page > 1 ? `/reweights?page=${page}` : "/reweights";
}

/**
 * Pagination for the server rendered reweights list; each page is a navigation.
 */
export function ReweightPagination({ page, totalItems, itemsPerPage }: ReweightPaginationProps) {
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
