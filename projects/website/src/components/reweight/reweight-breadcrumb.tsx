"use client";

import { useBreadcrumbTitle } from "@/components/layout/breadcrumb-context";

/**
 * Sets the last breadcrumb to the reweight's name. Renders nothing.
 */
export function ReweightBreadcrumb({ name }: { name: string }) {
  useBreadcrumbTitle(name);
  return null;
}
