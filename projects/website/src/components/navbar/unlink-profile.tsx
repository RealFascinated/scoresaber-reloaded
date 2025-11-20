"use client";

import useDatabase from "@/hooks/use-database";
import { ConfirmationDialog } from "../ui/confirmation-dialog";

export default function UnlinkProfile() {
  const database = useDatabase();

  async function unlinkAccount() {
    await database.setMainPlayerId("");
  }

  return (
    <ConfirmationDialog
      trigger={
        <div className="hover:bg-destructive/10 relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-red-600 transition-all duration-200 outline-none select-none hover:text-red-700">
          Unlink Account
        </div>
      }
      title="Unlink Account"
      description="This will unlink your account from the website. You'll need to claim a new profile again."
      confirmText="Unlink"
      variant="destructive"
      onConfirm={unlinkAccount}
    />
  );
}
