import Card from "@/components/card";
import Settings from "@/components/settings/settings";

export default function SettingsPage() {
  return (
    <main className="min-h-screen w-full">
      <Card className="w-full gap-4">
        <div>
          <p className="font-semibold">Settings</p>
          <p>Configure settings your ScoreSaber Reloaded settings!</p>
        </div>
        <Settings />
      </Card>
    </main>
  );
}
