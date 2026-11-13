"use client";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useUpdateUserPreferences } from "@/hooks/use-user-preferences";
import { DEFAULT_USER_PREFERENCES } from "@ssr/common/schemas/user/default-preferences";
import { toast } from "sonner";
import { Button } from "../../ui/button";

export default function ResetSettings() {
  const { updateAsync } = useUpdateUserPreferences();

  async function reset() {
    await updateAsync(DEFAULT_USER_PREFERENCES);
    toast.success("Your settings have been reset");
    // The settings forms only read the saved values when they open
    window.location.reload();
  }

  return (
    <ConfirmationDialog
      trigger={<Button variant="destructive">Reset Settings</Button>}
      title="Reset Settings"
      description="This will reset all of your settings, to their default values."
      confirmText="Reset"
      variant="destructive"
      onConfirm={async () => await reset()}
    />
  );
}
