import Card from "@/components/card";
import Settings from "@/components/settings/settings";

export default function SettingsPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <Card className="w-full lg:max-w-[1200px] h-fit gap-4">
        <Settings />
      </Card>
    </div>
  );
}
