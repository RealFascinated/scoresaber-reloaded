import Card from "@/components/card";
import Settings from "@/components/settings/settings";

export default function SettingsPage() {
  return (
    <main className="min-h-screen w-full flex justify-center">
      <Card className="w-full h-fit gap-4 max-w-screen-2xl">
        <div>
          <p className="font-semibold">Settings</p>
          <p>Configure settings your ScoreSaber Reloaded settings!</p>
        </div>
        <Settings />
      </Card>
    </main>
  );
}
