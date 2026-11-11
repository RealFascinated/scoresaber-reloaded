import { ReactNode } from "react";

type ScoreSectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

export function ScoreSection({ id, title, children }: ScoreSectionProps) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

type ScoreSectionNavProps = {
  sections: { id: string; label: string }[];
};

export function ScoreSectionNav({ sections }: ScoreSectionNavProps) {
  if (sections.length < 2) {
    return null;
  }

  return (
    <nav aria-label="Score sections" className="flex flex-wrap items-center gap-1.5">
      {sections.map(section => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="bg-control ring-border hover:bg-accent text-muted-foreground hover:text-foreground rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors"
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
