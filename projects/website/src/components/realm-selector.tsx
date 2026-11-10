"use client";

import { useRealm } from "@/components/providers/realm-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SharedIcons } from "@/shared-icons";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { useState } from "react";

export default function RealmSelector() {
  const { realms, realmId, setRealmId } = useRealm();
  const [open, setOpen] = useState(false);

  if (realms.length === 0) {
    return null;
  }

  const selectRealm = (id: number) => {
    setRealmId(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Select realm"
          className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground border-border flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors"
        >
          <SharedIcons.ComboBoxToggleIcon className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={12} className="w-64 p-0 text-sm select-none">
        <div className="px-4 pt-3 pb-2">
          <span className="text-muted-foreground text-xs font-medium">Active Realm</span>
        </div>

        <div className="flex flex-col p-1.5">
          {realms.map(realm => {
            const isActive = realm.id === realmId;
            return (
              <div key={realm.id} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => selectRealm(realm.id)}
                  className="hover:bg-accent flex flex-1 items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {isActive && <SharedIcons.SelectCheckIcon className="text-primary size-4" />}
                  </span>
                  <span className={isActive ? "font-medium" : "text-muted-foreground"}>
                    {realm.name}
                    {!realm.isAcceptingScores && " (ended)"}
                  </span>
                </button>
                {isActive && realm.id !== DEFAULT_REALM_ID && (
                  <button
                    type="button"
                    aria-label="Leave realm"
                    onClick={() => selectRealm(DEFAULT_REALM_ID)}
                    className="text-muted-foreground hover:text-foreground mr-1 flex size-7 items-center justify-center rounded-md"
                  >
                    <SharedIcons.RealmLeaveIcon className="size-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
