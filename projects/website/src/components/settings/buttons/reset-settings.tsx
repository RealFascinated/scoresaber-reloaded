import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import useDatabase from "@/hooks/use-database";
import { Button } from "../../ui/button";

export default function ResetSettings() {
  const database = useDatabase();

  async function reset() {
    await database.reset();
    // Refresh the page
    window.location.reload();
  }

  return (
    <ConfirmationDialog
      trigger={<Button variant="destructive">Reset Settings</Button>}
      title="Reset Database"
      description="This will reset the database to default values. You'll need to claim a new profile again."
      confirmText="Reset"
      variant="destructive"
      onConfirm={async () => await reset()}
    />
  );
}
