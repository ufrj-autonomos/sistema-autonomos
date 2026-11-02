import { requirePageUser } from '@/lib/session';
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, FileText } from "lucide-react";
import { adminModels } from "@/lib/institutional/admin-config";
import { db } from "@/lib/institutional/db";
import { DynamicForm } from "@/components/institutional/dynamic-form";

export default async function AdminFormPage(props: { params: Promise<{ table: string; id: string }> }) {
  await requirePageUser(true);
  const params = await props.params;
  const { table: tableSlug, id } = params;
  if (tableSlug === "member") redirect(`/gestao/integrantes/${id}`);
  if (tableSlug === "project") redirect(`/gestao/projetos/${id}`);
  const config = adminModels[tableSlug];

  if (!config) {
    notFound();
  }

  const isNew = id === "new";
  let record = null;

  if (!isNew) {
    const recordId = parseInt(id, 10);
    if (isNaN(recordId)) {
      notFound();
    }
    const model = (db as any)[config.table];
    record = await model.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      notFound();
    }
  }

  // Se a tabela for member, precisamos passar a lista de projetos para os checkboxes
  let allProjects: any[] = [];
  if (tableSlug === "member") {
    allProjects = await db.project.findMany({
      select: { id: true, slug: true, name: true, teamId: true },
    });
  }

  // Fetch relations data for 'relation' type fields
  const relationsData: Record<string, any[]> = {};
  for (const field of config.fields) {
    if (field.type === "relation" && field.relationModel) {
      const relationModelName = field.relationModel;
      const model = (db as any)[relationModelName];
      if (model) {
        try {
          const records = await model.findMany({
            orderBy: { id: "desc" },
          });
          relationsData[field.name] = records;
        } catch (err) {
          console.error(`Error fetching relation data for ${relationModelName}:`, err);
          relationsData[field.name] = [];
        }
      }
    }
  }

  // Plainify objects to prevent Next.js Server Component Serialization errors
  const plainRecord = record ? JSON.parse(JSON.stringify(record)) : null;
  const plainProjectsList = JSON.parse(JSON.stringify(allProjects));
  const plainRelationsData = JSON.parse(JSON.stringify(relationsData));

  return (
    <div className="max-w-5xl space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div>
        <Link
          href={`/gestao/site/${tableSlug}`}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar para {config.name}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {isNew ? `Criar ${config.name.replace(/s$/, "")}` : `Editar ${config.name.replace(/s$/, "")} #${record?.id}`}
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                {isNew ? "Novo" : `#${record?.id}`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isNew
                ? "Preencha os campos abaixo. Campos com * são obrigatórios. Textos longos aceitam Markdown (.md)."
                : `Edição dos dados do registro #${record?.id}. As alterações atualizam o site imediatamente.`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
        <DynamicForm
          config={config}
          initialData={plainRecord}
          isNew={isNew}
          tableSlug={tableSlug}
          projectsList={plainProjectsList}
          relationsData={plainRelationsData}
        />
      </div>
    </div>
  );
}
