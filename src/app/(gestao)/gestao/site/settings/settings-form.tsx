"use client";

import { useState } from "react";
import { updateSiteSettings } from "./settings-actions";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { SiteSettings } from "@/generated/institutional";

export function SettingsForm({ initialData }: { initialData: SiteSettings }) {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    try {
      const result = await updateSiteSettings(formData);
      if (result.success) {
        if (result.warning) toast.warning(result.warning);
      toast.success("Configurações atualizadas com sucesso!");
      } else {
        toast.error(result.error || "Erro ao salvar.");
      }
    } catch (error) {
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      {/* Geral */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Informações Gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="contactEmails" className="text-sm font-medium">Emails de Contato (separados por vírgula)</label>
            <input
              id="contactEmails"
              name="contactEmails"
              defaultValue={initialData.contactEmails}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="text-xs text-muted-foreground">Estes emails receberão as mensagens do formulário de contato.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="whatsappNumber" className="text-sm font-medium">Número do WhatsApp</label>
            <input
              id="whatsappNumber"
              name="whatsappNumber"
              defaultValue={initialData.whatsappNumber}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="text-xs text-muted-foreground">Apenas números. Ex: 5521997918117</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="location" className="text-sm font-medium">Localização (Rodapé)</label>
            <input
              id="location"
              name="location"
              defaultValue={initialData.location}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="text-xs text-muted-foreground">Ex: NCE, Bloco H...</p>
          </div>
        </div>
      </section>

      {/* Nautilus */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-border pb-2 text-[#4A7BB7]">Redes - Nautilus</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="nautilusEmail" className="text-sm font-medium">Email Nautilus</label>
            <input
              id="nautilusEmail"
              name="nautilusEmail"
              defaultValue={initialData.nautilusEmail || ""}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="nautilusInstagram" className="text-sm font-medium">Link do Instagram</label>
            <input
              id="nautilusInstagram"
              name="nautilusInstagram"
              defaultValue={initialData.nautilusInstagram || ""}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="nautilusLinkedin" className="text-sm font-medium">Link do LinkedIn</label>
            <input
              id="nautilusLinkedin"
              name="nautilusLinkedin"
              defaultValue={initialData.nautilusLinkedin || ""}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="nautilusFormLink" className="text-sm font-medium">Link do Forms (Processo Seletivo)</label>
            <input
              id="nautilusFormLink"
              name="nautilusFormLink"
              defaultValue={initialData.nautilusFormLink || ""}
              placeholder="https://forms.gle/..."
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">Deixe em branco se o processo seletivo estiver fechado no momento.</p>
          </div>
        </div>
      </section>

      {/* Harpia */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-border pb-2 text-[#A040FF]">Redes & Formulários - Harpia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="harpiaEmail" className="text-sm font-medium">Email Harpia</label>
            <input
              id="harpiaEmail"
              name="harpiaEmail"
              defaultValue={initialData.harpiaEmail || ""}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="harpiaInstagram" className="text-sm font-medium">Link do Instagram</label>
            <input
              id="harpiaInstagram"
              name="harpiaInstagram"
              defaultValue={initialData.harpiaInstagram || ""}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="harpiaLinkedin" className="text-sm font-medium">Link do LinkedIn</label>
            <input
              id="harpiaLinkedin"
              name="harpiaLinkedin"
              defaultValue={initialData.harpiaLinkedin || ""}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="harpiaFormLink" className="text-sm font-medium">Link do Forms (Processo Seletivo)</label>
            <input
              id="harpiaFormLink"
              name="harpiaFormLink"
              defaultValue={initialData.harpiaFormLink || ""}
              placeholder="https://forms.gle/..."
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">Deixe em branco se o processo seletivo estiver fechado no momento.</p>
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-70"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isPending ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </form>
  );
}
