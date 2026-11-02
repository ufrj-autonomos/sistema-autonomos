import { requirePageUser } from '@/lib/session';
import { getSiteSettings } from "@/lib/institutional/settings";
import { SettingsForm } from "./settings-form";
import { Settings } from "lucide-react";

export const metadata = {
  title: "Configurações Globais | Admin",
};

export default async function SettingsPage() {
  await requirePageUser(true);
  const settings = await getSiteSettings();

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-display font-semibold">Configurações Globais</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Gerencie e-mails de contato, endereços e redes sociais que aparecem no site.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden p-6 shadow-sm">
        <SettingsForm initialData={settings} />
      </div>
    </div>
  );
}
