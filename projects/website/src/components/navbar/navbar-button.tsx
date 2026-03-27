"use client";

import { cn } from "@/common/utils";
import SimpleLink from "@/components/simple-link";
import { ComponentProps, ComponentPropsWithoutRef, ReactNode } from "react";

const shellBase =
  "group relative flex h-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors duration-150";

function navbarShellClassName(isActive: boolean, className?: string) {
  return cn(
    shellBase,
    isActive
      ? "bg-primary/10 text-primary border-primary/20 border"
      : "text-muted-foreground hover:text-primary hover:bg-primary/5",
    className
  );
}

function NavbarActiveIndicator({ isActive }: { isActive: boolean }) {
  if (!isActive) {
    return null;
  }
  return (
    <div
      className="bg-primary absolute -bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full transition-opacity duration-200"
      aria-hidden
    />
  );
}

export type NavbarButtonLinkProps = Omit<
  ComponentProps<typeof SimpleLink>,
  "href" | "className" | "children"
> & {
  isActive?: boolean;
  className?: string;
  children: ReactNode;
  href: string;
};

export type NavbarButtonDivProps = Omit<ComponentPropsWithoutRef<"div">, "className" | "children"> & {
  isActive?: boolean;
  className?: string;
  children: ReactNode;
};

export type NavbarButtonProps = NavbarButtonLinkProps | NavbarButtonDivProps;

export default function NavbarButton(props: NavbarButtonProps) {
  const isActive = props.isActive ?? false;
  const className = props.className;
  const children = props.children;
  const shell = navbarShellClassName(isActive, className);

  if ("href" in props && props.href !== undefined) {
    const {
      href,
      target,
      draggable,
      isActive: _omitActive,
      className: _omitClassName,
      children: _omitChildren,
      ...simpleLinkRest
    } = props as NavbarButtonLinkProps;
    return (
      <SimpleLink
        href={href}
        className={shell}
        {...simpleLinkRest}
        target={target ?? (href.startsWith("/") ? "_self" : "_blank")}
        draggable={draggable ?? false}
      >
        {children}
        <NavbarActiveIndicator isActive={isActive} />
      </SimpleLink>
    );
  }

  const {
    isActive: _omitActive,
    className: _omitClassName,
    children: _omitChildren,
    ...divRest
  } = props as NavbarButtonDivProps;
  return (
    <div className={shell} {...divRest}>
      {children}
      <NavbarActiveIndicator isActive={isActive} />
    </div>
  );
}
