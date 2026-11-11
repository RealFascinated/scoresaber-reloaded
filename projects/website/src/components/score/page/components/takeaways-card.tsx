import Card from "@/components/card";
import { CircleCheck, Target } from "lucide-react";
import { Takeaway } from "../replay-takeaways";

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
        <p className="text-muted-foreground text-sm">Nothing stood out here.</p>
      ) : (
        items.map(item => (
          <div key={item.title} className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{item.title}</span>
            <span className="text-muted-foreground text-sm leading-snug">{item.detail}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function TakeawaysCard({ takeaways }: { takeaways: Takeaway[] }) {
  if (takeaways.length === 0) {
    return null;
  }

  return (
    <Card className="gap-5 rounded-xl p-5">
      <div>
        <h2 className="text-lg font-semibold">The Short Version</h2>
        <p className="text-muted-foreground text-sm">
          What this replay says about your play, in plain terms.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <TakeawayList items={takeaways.filter(item => item.tone === "good")} tone="good" />
        <TakeawayList items={takeaways.filter(item => item.tone === "improve")} tone="improve" />
      </div>
    </Card>
  );
}
