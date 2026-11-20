"use client";

import { cn } from "@/common/utils";
import { useChatStatus } from "@/components/chat/chat-queries";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import useMe from "@/hooks/use-me";
import { useUserPreference } from "@/hooks/use-user-preferences";
import { SharedIcons } from "@/shared-icons";
import { CHAT_ROUTE } from "@ssr/common/api-routes";

type AskChatButtonProps = {
  prompt: string;
  tooltip?: string;
  label?: string;
  size?: number;
  className?: string;
};

/**
 * Whether the chat entry points should be shown: the user is signed in, chat is available and they haven't turned it off.
 */
export function useChatAvailable() {
  const { data: me } = useMe();
  const chatDisabled = useUserPreference("chatDisabled");
  const { data: chatAvailable } = useChatStatus(me != null && !chatDisabled);
  return me != null && !chatDisabled && chatAvailable === true;
}

/**
 * Opens a new chat that starts with the given prompt. Renders a labelled button when `label` is set, otherwise an icon button.
 */
export default function AskChatButton({
  prompt,
  tooltip = "Ask the chat about this",
  label,
  size = 28,
  className,
}: AskChatButtonProps) {
  const available = useChatAvailable();
  if (!available) {
    return null;
  }

  const href = `${CHAT_ROUTE}?prompt=${encodeURIComponent(prompt)}`;
  const Icon = SharedIcons.ChatAskIcon;

  if (label) {
    return (
      <SimpleLink href={href}>
        <Button variant="outline" size="sm" className={cn("gap-1.5", className)}>
          <Icon className="size-4" />
          {label}
        </Button>
      </SimpleLink>
    );
  }

  return (
    <SimpleTooltip display={<p>{tooltip}</p>}>
      <SimpleLink href={href}>
        <button
          type="button"
          aria-label={tooltip}
          className={cn(
            "border-border bg-control hover:bg-accent hover:text-accent-foreground hover:border-primary/50 focus-visible:ring-primary/50 flex cursor-pointer items-center justify-center rounded-md border p-(--spacing-xs) text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-hidden",
            className
          )}
          style={{ width: size, height: size }}
        >
          <Icon className="size-full" />
        </button>
      </SimpleLink>
    </SimpleTooltip>
  );
}
