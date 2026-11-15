"use client";

import { useBreadcrumbTitle } from "@/components/layout/breadcrumb-context";

/**
 * Sets the last breadcrumb to the ranked batch's name. Renders nothing.
 */
export function RankedBatchBreadcrumb({ name }: { name: string }) {
  useBreadcrumbTitle(name);
  return null;
}
