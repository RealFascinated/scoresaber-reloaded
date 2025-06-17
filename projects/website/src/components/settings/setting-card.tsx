import { ReactNode } from "react";

interface SettingCardProps {
  children: ReactNode;
}

export function SettingCard({ children }: SettingCardProps) {
  return <div className="border-border/50 bg-card rounded-lg border p-4">{children}</div>;
}
