"use client";

import { signInWithSteam } from "@/common/auth/auth-api";
import { deleteChatConversation, renameChatConversation } from "@/common/chat/chat-api";
import Avatar from "@/components/avatar";
import { getConversationGroupLabel, type ConversationGroupLabel } from "@/components/chat/chat-display";
import { CHAT_CONVERSATIONS_QUERY_KEY, useChatConversations } from "@/components/chat/chat-queries";
import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useMainPlayer, useMainPlayerId } from "@/hooks/use-main-player";
import { SharedIcons } from "@/shared-icons";
import { CHAT_ROUTE } from "@ssr/common/api-routes";
import type { ChatConversation } from "@ssr/common/schemas/chat/chat-conversation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type ConversationItemProps = {
  conversation: ChatConversation;
  isActive: boolean;
  onRename: (conversationId: string, title: string) => void;
  onDelete: (conversationId: string) => void;
};

function ConversationItem({ conversation, isActive, onRename, onDelete }: ConversationItemProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title ?? "");
  const label = conversation.title ?? "New chat";

  const commitRename = () => {
    const trimmed = title.trim();
    setEditing(false);
    if (trimmed === "" || trimmed === conversation.title) {
      return;
    }
    onRename(conversation.id, trimmed);
  };

  if (editing) {
    return (
      <SidebarMenuItem>
        <form
          className="flex items-center gap-1 rounded-md bg-sidebar-accent/60 p-1"
          onSubmit={event => {
            event.preventDefault();
            commitRename();
          }}
        >
          <input
            ref={element => element?.focus()}
            value={title}
            onChange={event => setTitle(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Escape") {
                setTitle(conversation.title ?? "");
                setEditing(false);
              }
            }}
            maxLength={100}
            aria-label="Chat name"
            className="min-w-0 flex-1 bg-transparent px-1.5 py-0.5 text-sm outline-hidden"
          />
          <Button type="submit" size="icon" variant="ghost" className="size-7" aria-label="Save the name">
            <SharedIcons.SaveChatNameIcon className="size-3.5" />
          </Button>
        </form>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className="h-9 pr-14 group-hover/menu-item:bg-sidebar-accent group-hover/menu-item:text-sidebar-accent-foreground group-has-[[data-sidebar=menu-action]]/menu-item:pr-14 data-[active=true]:bg-primary/15 data-[active=true]:group-hover/menu-item:bg-primary/15"
      >
        <SimpleLink
          href={`${CHAT_ROUTE}/${conversation.id}`}
          draggable={false}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
        >
          <span className="truncate">{label}</span>
        </SimpleLink>
      </SidebarMenuButton>
      <SidebarMenuAction
        showOnHover
        aria-label="Rename the chat"
        className="top-2 right-7"
        onClick={() => {
          setTitle(conversation.title ?? "");
          setEditing(true);
        }}
      >
        <SharedIcons.RenameChatIcon />
      </SidebarMenuAction>
      <ConfirmationDialog
        title="Delete this chat?"
        description="The conversation and its messages are deleted for good."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => onDelete(conversation.id)}
        trigger={
          <SidebarMenuAction
            showOnHover
            aria-label="Delete the chat"
            className="top-2 hover:bg-destructive/20 hover:text-destructive"
          >
            <SharedIcons.DeleteChatIcon />
          </SidebarMenuAction>
        }
      />
    </SidebarMenuItem>
  );
}

function ChatUser() {
  const playerId = useMainPlayerId();
  const player = useMainPlayer().data;

  if (playerId === undefined || playerId === "") {
    return (
      <button
        type="button"
        onClick={() => signInWithSteam(CHAT_ROUTE).catch(error => toast.error(error.message))}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
      >
        <SharedIcons.SignInIcon className="size-5 shrink-0 text-success" />
        <span className="font-medium">Sign in</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent/60">
      <Avatar
        size={32}
        src={player?.avatar ?? ""}
        className="box-border size-8 shrink-0 rounded-full border border-border"
        alt={player?.name ?? "You"}
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
        {player?.name ?? "Signed in"}
      </span>
    </div>
  );
}

/**
 * The chat app's sidebar: branding, new chat, the user's chats with rename, delete and paging, and the user.
 */
type ChatSidebarProps = {
  activeConversationId: string | null;
  onResize: (width: number) => void;
};

export default function ChatSidebar({ activeConversationId, onResize }: ChatSidebarProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const conversations = useChatConversations();
  const [now] = useState(() => new Date());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });

  const renameMutation = useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      renameChatConversation(conversationId, title),
    onSuccess: invalidate,
    onError: error => toast.error(error instanceof Error ? error.message : "Failed to rename the chat"),
  });

  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) => deleteChatConversation(conversationId),
    onSuccess: async (_data, conversationId) => {
      await invalidate();
      if (conversationId === activeConversationId) {
        router.push(CHAT_ROUTE);
      }
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Failed to delete the chat"),
  });

  const items = conversations.data?.pages.flatMap(page => page.items) ?? [];
  const groups: { label: ConversationGroupLabel; items: ChatConversation[] }[] = [];
  for (const conversation of items) {
    const label = getConversationGroupLabel(conversation.updatedAt, now);
    const group = groups.find(candidate => candidate.label === label);
    if (group === undefined) {
      groups.push({ label, items: [conversation] });
    } else {
      group.items.push(conversation);
    }
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-3 p-3">
        <SimpleLink
          href={CHAT_ROUTE}
          draggable={false}
          className="flex min-w-0 items-center gap-2.5 rounded-md px-1 py-0.5"
        >
          <Image
            width={28}
            height={28}
            className="size-7 shrink-0"
            src="/assets/logos/scoresaber.png"
            alt="ScoreSaber Logo"
          />
          <span className="truncate text-base font-semibold tracking-tight">SSR Chat</span>
        </SimpleLink>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={activeConversationId === null}
              className="h-10 justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 font-medium text-foreground hover:bg-primary/20 data-[active=true]:bg-primary/15"
            >
              <SimpleLink
                href={CHAT_ROUTE}
                draggable={false}
                onClick={() => {
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}
              >
                <SharedIcons.NewChatIcon className="size-4" />
                <span>New chat</span>
              </SimpleLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SimpleLink
          href="/"
          draggable={false}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
        >
          <SharedIcons.ChatBackIcon className="size-3.5" />
          <span>Back to ScoreSaber Reloaded</span>
        </SimpleLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {conversations.isPending ? (
              <div className="flex flex-col gap-1 p-1">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="h-9 animate-pulse rounded-md bg-muted/60" />
                ))}
              </div>
            ) : conversations.isError ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                Could not load your chats.
              </p>
            ) : items.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No chats yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {groups.map(group => (
                  <div key={group.label} className="flex flex-col gap-0.5">
                    <SidebarGroupLabel className="h-6 text-[11px] font-medium tracking-wide uppercase">
                      {group.label}
                    </SidebarGroupLabel>
                    <SidebarMenu className="gap-0.5">
                      {group.items.map(conversation => (
                        <ConversationItem
                          key={conversation.id}
                          conversation={conversation}
                          isActive={conversation.id === activeConversationId}
                          onRename={(conversationId, title) =>
                            renameMutation.mutate({ conversationId, title })
                          }
                          onDelete={conversationId => deleteMutation.mutate(conversationId)}
                        />
                      ))}
                    </SidebarMenu>
                  </div>
                ))}
              </div>
            )}
            {conversations.hasNextPage && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 w-full gap-1.5 text-muted-foreground"
                disabled={conversations.isFetchingNextPage}
                onClick={() => conversations.fetchNextPage()}
              >
                <SharedIcons.ChatLoadMoreIcon className="size-4" />
                <span>Load more</span>
              </Button>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <ChatUser />
      </SidebarFooter>
      <div
        aria-hidden
        className="absolute inset-y-0 -right-1 z-30 hidden w-2 cursor-col-resize touch-none md:block"
        onPointerDown={event => {
          event.preventDefault();
          const handle = event.currentTarget;
          handle.setPointerCapture(event.pointerId);
          const move = (moveEvent: PointerEvent) => onResize(moveEvent.clientX);
          const stop = () => {
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", stop);
            handle.removeEventListener("pointercancel", stop);
          };
          handle.addEventListener("pointermove", move);
          handle.addEventListener("pointerup", stop);
          handle.addEventListener("pointercancel", stop);
        }}
      />
    </Sidebar>
  );
}
