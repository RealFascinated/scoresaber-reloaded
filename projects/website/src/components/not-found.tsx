"use client";

import Link from "next/link";
import { Button } from "./ui/button";

type NotFoundProps = {
  title?: string;
  description?: string;
};

export default function NotFound({ title, description }: NotFoundProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-bold">{title ?? "Not Found"}</h1>
        <p className="text-lg">{description ?? "The page you are looking for does not exist."}</p>
      </div>

      <Link href="/">
        <Button>Return Home</Button>
      </Link>
    </div>
  );
}
