import Card from "@/components/card";
import Settings from "@/components/settings/settings";

export default function SettingsPage() {
  return (
    <Card className="w-full h-fit gap-4">
      <div>
        <p className="font-semibold">Settings</p>
        <p>Configure settings your ScoreSaber Reloaded settings!</p>
      </div>
      <Settings />
    </Card>
  );
}
