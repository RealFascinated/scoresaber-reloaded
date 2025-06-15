"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";

type NotFoundProps = {
  title?: string;
  description?: string;
};

export default function NotFound({ title, description }: NotFoundProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <Image
        src="https://cdn.fascinated.cc/assets/get-real-beat-saber.gif"
        alt="404"
        className="h-[250px]"
        width={400}
        height={250}
      />

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold text-red-400">{title ?? "Not Found"}</h1>
        <p className="text-lg">{description ?? "The page you are looking for does not exist."}</p>
      </div>

      <Link href="/">
        <Button>Return Home</Button>
      </Link>
    </div>
  );
}
