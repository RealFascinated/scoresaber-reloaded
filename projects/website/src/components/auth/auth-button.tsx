"use client";

import { authClient } from "@/common/auth/auth-client";
import useDatabase from "@/hooks/use-database";
import { env } from "@ssr/common/env";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingIcon } from "../loading-icon";
import ProfileButton from "../navbar/profile-button";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export function AuthButton() {
  const database = useDatabase();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const { data: player } = useQuery({
    queryKey: ["player", session?.user.id],
    queryFn: () => database.getPlayer(session?.user.steamId!),
    enabled: !!session?.user.steamId,
  });

  const [isOpen, setIsOpen] = useState(false);

  if (isPending) {
    return null;
  }

  return session ? (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className="flex items-center justify-center">
        {player ? <ProfileButton player={player} /> : null}
      </PopoverTrigger>
      <PopoverContent className="w-screen md:w-64 p-2 flex flex-col gap-2 mt-2">
        {player ? (
          <Link
            href={`${env.NEXT_PUBLIC_WEBSITE_URL}/player/${player?.id}`}
            className="flex items-center gap-2 p-2 bg-secondary rounded-md hover:bg-secondary/80 transform-gpu transition-all"
            onClick={() => setIsOpen(false)}
          >
            <img src={player?.avatar} alt={player?.name} className="w-10 h-10 rounded-full" />
            <div>
              <p>{player?.name}</p>
              <p className="text-xs text-muted-foreground">#{player?.rank}</p>
            </div>
          </Link>
        ) : (
          <LoadingIcon />
        )}

        <Button
          variant="outline"
          onClick={() => {
            authClient.signOut(
              {},
              {
                onSuccess: () => {
                  router.push("/");
                  router.refresh();
                },
              }
            );
          }}
        >
          Logout
        </Button>
      </PopoverContent>
    </Popover>
  ) : (
    <Link href="/auth/login" prefetch={false}>
      <Button variant="outline">Login</Button>
    </Link>
  );
}
