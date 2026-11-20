import Card from "@/components/card";
import AskChatButton from "@/components/chat/ask-chat-button";
import { Takeaway } from "@ssr/common/replay/replay-takeaways";
import { CircleCheck, Target } from "lucide-react";

function TakeawayList({ items, tone }: { items: Takeaway[]; tone: Takeaway["tone"] }) {
  const Icon = tone === "good" ? CircleCheck : Target;
  const color = tone === "good" ? "text-success" : "text-warning";

  return (
    <div className="flex flex-col gap-3">
      <h3 className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
        <Icon className="size-4" />
        {tone === "good" ? "What went well" : "What to work on"}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing stood out here.</p>
      ) : (
        items.map(item => (
          <div key={item.title} className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{item.title}</span>
            <span className="text-sm leading-snug text-muted-foreground">{item.detail}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function TakeawaysCard({
  takeaways,
  askPrompt,
}: {
  takeaways: Takeaway[];
  askPrompt?: string;
}) {
  if (takeaways.length === 0) {
    return null;
  }

  return (
    <Card className="gap-5 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">The Short Version</h2>
        </div>
        {askPrompt && <AskChatButton prompt={askPrompt} label="Dig deeper" />}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <TakeawayList items={takeaways.filter(item => item.tone === "good")} tone="good" />
        <TakeawayList items={takeaways.filter(item => item.tone === "improve")} tone="improve" />
      </div>
    </Card>
  );
}
