import { getServerSession } from "@/common/auth/session-server";
import { isChatEnabled } from "@/common/chat/chat-server";
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

export default async function ChatPage() {
  const cookie = (await cookies()).toString();
  const session = await getServerSession(cookie);
  if (session.status === "anonymous") {
    return <SteamSignInRedirect redirectPath="/chat" failed={false} />;
  }
  if (!(await isChatEnabled(cookie))) {
    notFound();
  }
  return <ChatShell key="new" conversationId={null} />;
}
