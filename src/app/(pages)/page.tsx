"use client";

import { useLiveQuery } from "dexie-react-hooks";
import useDatabase from "../hooks/use-database";

export default function Home() {
  const database = useDatabase();
  const settings = useLiveQuery(() => database.getSettings());
  return <>{settings?.playerId}</>;
}
