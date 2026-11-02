import { requirePageUser } from '@/lib/session';
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft, Database, Layers } from "lucide-react";
import { adminModels } from "@/lib/institutional/admin-config";
import { db } from "@/lib/institutional/db";
import { DataTable } from "@/components/institutional/data-table";

export default async function AdminTablePage(props: { params: Promise<{ table: string }> }) {
  await requirePageUser(true);
  const params = await props.params;
  const tableSlug = params.table;
  const config = adminModels[tableSlug];

  if (!config) {
    notFound();
  }

  // Fetch all records from the db
  const model = (db as any)[config.table];

  const query: any = {
    orderBy: { id: "desc" },
  };

  if (tableSlug === "galleryimage") {
    query.include = {
      project: true,
      competition: true,
      timelineEvent: true,
      team: true,
    };
  } else if (["member", "project", "sponsor", "competition", "timelineevent"].includes(tableSlug)) {
    query.include = {
      team: true,
    };
  }

  const records = await model.findMany(query);
  const plainRecords = JSON.parse(JSON.stringify(records));

  return (
    <div className="w-full space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground mb-1">
            <Link href="/gestao/site" className="hover:text-foreground transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">{config.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              {config.name}
            </h1>
            <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
              {records.length} {records.length === 1 ? "item" : "itens"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Visualização, pesquisa instantânea e gerenciamento de registros da tabela.
          </p>
        </div>

        <Link
          href={`/gestao/site/${tableSlug}/new`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-xs text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Novo {config.name.replace(/s$/, "")}</span>
        </Link>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <DataTable config={config} data={plainRecords} tableSlug={tableSlug} />
      </div>
    </div>
  );
}
