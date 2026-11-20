import { getServerSession } from "@/common/auth/session-server";
import { isChatEnabled, isChatDisabledByUser } from "@/common/chat/chat-server";
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

type ChatPageProps = {
  searchParams: Promise<{ prompt?: string | string[] }>;
};

const MAX_INITIAL_PROMPT_LENGTH = 1000;

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { prompt } = await searchParams;
  const initialPrompt = (Array.isArray(prompt) ? prompt[0] : prompt)
    ?.trim()
    .slice(0, MAX_INITIAL_PROMPT_LENGTH);
  const cookie = (await cookies()).toString();
  const session = await getServerSession(cookie);
  if (session.status === "anonymous") {
    return (
      <SteamSignInRedirect
        redirectPath={initialPrompt ? `/chat?prompt=${encodeURIComponent(initialPrompt)}` : "/chat"}
        failed={false}
      />
    );
  }
  if (!(await isChatEnabled(cookie)) || (await isChatDisabledByUser(cookie))) {
    notFound();
  }
  return <ChatShell key="new" conversationId={null} initialPrompt={initialPrompt || undefined} />;
}
