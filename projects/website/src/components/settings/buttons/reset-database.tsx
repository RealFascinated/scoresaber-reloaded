import useDatabase from "@/hooks/use-database";
import SimpleTooltip from "../../simple-tooltip";
import { Button } from "../../ui/button";

export default function ResetDatabase() {
  const database = useDatabase();
  async function reset() {
    const confirmed = window.confirm("Are you sure you want to reset the database?");
    if (!confirmed) {
      return;
    }

    await database.reset();
    // Refresh the page
    window.location.reload();
  }

  return (
    <SimpleTooltip display="This will reset the database to its default values.">
      <Button variant="destructive" onClick={reset}>
        Reset
      </Button>
    </SimpleTooltip>
  );
}
