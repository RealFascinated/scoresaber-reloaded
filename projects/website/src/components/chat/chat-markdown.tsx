"use client";

import SimpleLink from "@/components/simple-link";
import ReactMarkdown, { type Components } from "react-markdown";

const LINK_CLASS = "text-primary underline underline-offset-2 hover:no-underline";

const components: Components = {
  a({ href, children }) {
    if (href !== undefined && href.startsWith("/")) {
      return (
        <SimpleLink href={href} className={LINK_CLASS}>
          {children}
        </SimpleLink>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-xs">{children}</table>
      </div>
    );
  },
};

/**
 * Renders the assistant's text. Site links stay in the app, everything else opens in a new tab.
 */
export default function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="text-sm leading-7 break-words [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-border [&_li]:my-1 [&_li]:pl-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-secondary [&_pre]:p-3 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_th]:bg-secondary/60 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_tr:nth-child(even)_td]:bg-secondary/30 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown components={components}>{text}</ReactMarkdown>
    </div>
  );
}
