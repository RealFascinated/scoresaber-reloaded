import AskChatButton from "@/components/chat/ask-chat-button";
import { ReactNode } from "react";

export function PageTitle({
  title,
  actions,
  askPrompt,
}: {
  title: string;
  actions?: ReactNode;
  askPrompt?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {(actions || askPrompt) && (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {askPrompt && <AskChatButton prompt={askPrompt} label="Ask Chat" />}
        </div>
      )}
    </div>
  );
}
