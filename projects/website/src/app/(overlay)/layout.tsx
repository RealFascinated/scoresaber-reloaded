import { ReactNode } from "react";

/**
 * The overlay fills the whole browser source. It must not sit in the site's centred, width-capped
 * container, or the canvas is pushed right on sources wider than that container.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return <main className="fixed inset-0 overflow-hidden text-white">{children}</main>;
}
