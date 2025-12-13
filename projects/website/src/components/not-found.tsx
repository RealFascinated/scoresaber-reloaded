"use client";

import SimpleLink from "@/components/simple-link";
import Image from "next/image";
import Card from "./card";
import { Button } from "./ui/button";

type NotFoundProps = {
  title: string;
  description: string;
};

export default function NotFound({ title, description }: NotFoundProps) {
  return (
    <div className="flex w-full justify-center">
      <Card className="flex w-full flex-col items-center gap-6 md:w-4xl">
        <Image src="https://cdn.fascinated.cc/wqmfeQ.gif" alt="404" width={128} height={128} />

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold text-red-400">{title}</h1>
          <p className="text-lg">{description}</p>
        </div>

        <SimpleLink href="/">
          <Button>Return Home</Button>
        </SimpleLink>
      </Card>
    </div>
  );
}
