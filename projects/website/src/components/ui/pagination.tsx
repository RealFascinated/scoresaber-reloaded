import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/16/solid";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import * as React from "react";

import { cn } from "@/common/utils";
import { ButtonProps, buttonVariants } from "@/components/ui/button";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav role="navigation" aria-label="pagination" className={cn(className)} {...props} />
);
Pagination.displayName = "Pagination";

const PaginationContent = ({ className, ...props }: React.ComponentProps<"ul">) => (
  <ul className={cn("flex flex-row items-center gap-(--spacing-xs)", className)} {...props} />
);

const PaginationItem = ({ className, ...props }: React.ComponentProps<"li">) => (
  <li className={cn("", className)} {...props} />
);

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({ className, isActive, size = "icon", ...props }: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className,
      "min-w-fit px-2"
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-(--spacing-xs)", className)}
    {...props}
  >
    <ChevronLeftIcon className="h-4 w-4" />
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-(--spacing-xs)", className)}
    {...props}
  >
    <ChevronRightIcon className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span aria-hidden className={cn("flex h-9 w-5 items-center justify-center", className)} {...props}>
    <DotsHorizontalIcon className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
