"use client";

import Card from "@/components/card";

export default function Home() {
  return (
    <main className="w-[1600px] h-full px-4">
      <div className="flex w-full gap-2">
        <Card className="w-[45%]">
          <p>hello</p>
        </Card>
        <Card className="w-[55%]">
          <p>hello</p>
        </Card>
      </div>
    </main>
  );
}
