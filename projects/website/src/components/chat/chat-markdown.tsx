"use client";

import { remarkChatDirectives, stripIncompleteDirective } from "@/components/chat/chat-directives";
import { ChatEntity } from "@/components/chat/chat-entity-cards";
import SimpleLink from "@/components/simple-link";
import { memo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkDirective from "remark-directive";

const LINK_CLASS = "text-primary underline underline-offset-2 hover:no-underline";

type EntityProps = {
  "data-kind"?: string;
  "data-id"?: string;
  "data-inline"?: string;
  children?: ReactNode;
};

type DirectiveComponents = {
  "chat-entity": (props: EntityProps) => ReactNode;
  "chat-entity-list": (props: { children?: ReactNode }) => ReactNode;
};

const SITE_PATH_PATTERN = /^\/(?![/\\])/;

const REMARK_PLUGINS = [remarkDirective, remarkChatDirectives];

const directiveComponents: DirectiveComponents = {
  "chat-entity"(props) {
    const kind = props["data-kind"];
    const id = props["data-id"];
    if ((kind !== "map" && kind !== "player") || id === undefined) {
      return props.children;
    }
    return (
      <ChatEntity kind={kind} id={id} isInline={props["data-inline"] === "true"}>
        {props.children}
      </ChatEntity>
    );
  },
  "chat-entity-list"({ children }) {
    return <div className="my-2 grid grid-cols-1 gap-1.5 empty:hidden md:grid-cols-2">{children}</div>;
  },
};

const components: Components & DirectiveComponents = {
  ...directiveComponents,
  a({ href, children }) {
    if (href !== undefined && SITE_PATH_PATTERN.test(href)) {
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
  img() {
    return null;
  },
  table({ children }) {
    return (
      <div className="my-2.5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-xs">{children}</table>
      </div>
    );
  },
};

function ChatMarkdown({ text, isStreaming = false }: { text: string; isStreaming?: boolean }) {
  const source = isStreaming ? stripIncompleteDirective(text) : text;
  return (
    <div className="text-[15px] leading-relaxed break-words [&_blockquote]:my-2.5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-border [&_li]:my-1 [&_li]:pl-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_pre]:my-2.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-secondary [&_pre]:p-3 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_th]:bg-secondary/60 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_tr:nth-child(even)_td]:bg-secondary/30 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Renders the assistant's text. Site links stay in the app, everything else opens in a new tab.
 */
export default memo(ChatMarkdown);
