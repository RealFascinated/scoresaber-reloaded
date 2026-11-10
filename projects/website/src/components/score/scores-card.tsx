"use client";

import Card from "../card";

type Props = {
  children: React.ReactNode;
};

export default function ScoresCard({ children }: Props) {
  return <Card className="flex gap-1">{children}</Card>;
}
