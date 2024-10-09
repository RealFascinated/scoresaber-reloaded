"use client";

import { formatNumberWithCommas } from "@/common/number-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";

const formSchema = z.object({
  username: z.string().min(3).max(50),
});

export default function SearchPlayer() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });
  const [results, setResults] = useState<ScoreSaberPlayerToken[] | undefined>();
  const [loading, setLoading] = useState(false);

  async function onSubmit({ username }: z.infer<typeof formSchema>) {
    setLoading(true);
    setResults(undefined); // Reset results
    const results = await scoresaberService.searchPlayers(username);
    setResults(results?.players);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input className="w-full sm:w-72 text-sm" placeholder="Query..." {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit">Search</Button>
        </form>
      </Form>

      {/* Results */}
      {loading == true && (
        <div className="flex items-center justify-center">
          <p>Loading...</p>
        </div>
      )}
      {results !== undefined && (
        <ScrollArea>
          <div className="flex flex-col gap-1 max-h-60">
            {results?.map(player => {
              return (
                <Link
                  href={`/player/${player.id}`}
                  key={player.id}
                  className="bg-secondary p-2 rounded-md flex gap-2 items-center hover:brightness-75 transition-all transform-gpu"
                >
                  <Avatar>
                    <AvatarImage src={player.profilePicture} />
                    <AvatarFallback>{player.name.at(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p>{player.name}</p>
                    <p className="text-gray-400 text-sm">#{formatNumberWithCommas(player.rank)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
