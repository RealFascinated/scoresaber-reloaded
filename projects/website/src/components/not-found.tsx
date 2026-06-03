import SimpleLink from "@/components/simple-link";
import Image from "next/image";
import { ReactNode } from "react";
import Card from "./card";
import { Button } from "./ui/button";

type NotFoundProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  footer?: ReactNode;
};

export default function NotFound({ title, description, actions, footer }: NotFoundProps) {
  return (
    <div className="flex w-full justify-center">
      <Card className="flex w-full flex-col items-center gap-6 md:w-4xl">
        <Image src="/assets/kitty.gif" alt="404" width={128} height={128} />

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold text-red-400">{title}</h1>
          <p className="text-lg">{description}</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <SimpleLink href="/">
              <Button>Return Home</Button>
            </SimpleLink>
            {actions}
          </div>
          {footer}
        </div>
      </Card>
    </div>
  );
}
