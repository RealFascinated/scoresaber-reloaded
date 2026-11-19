import { getServerSession } from "@/common/auth/session-server";
import { getServerChatConversation, isChatEnabled } from "@/common/chat/chat-server";
import SteamSignInRedirect from "@/components/auth/steam-sign-in-redirect";
import ChatShell from "@/components/chat/chat-shell";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Chat",
  description: "Ask about players, maps and scores.",
  alternates: {
    canonical: "/chat",
  },
};

type ChatConversationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatConversationPage({ params }: ChatConversationPageProps) {
  const { id } = await params;
  const cookie = (await cookies()).toString();
  const session = await getServerSession(cookie);
  if (session.status === "anonymous") {
    return <SteamSignInRedirect redirectPath={`/chat/${id}`} failed={false} />;
  }
  if (!(await isChatEnabled(cookie))) {
    notFound();
  }

  const conversation = await getServerChatConversation(cookie, id);
  if (conversation.status === "missing") {
    notFound();
  }
  return (
    <ChatShell
      key={id}
      conversationId={id}
      initialMessages={conversation.status === "found" ? conversation.data.messages : undefined}
    />
  );
}
