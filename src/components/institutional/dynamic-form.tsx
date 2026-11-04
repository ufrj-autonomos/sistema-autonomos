"use client";

import { selectOptions } from "@/lib/form-select";
import { normalizeMemberRole } from "@/lib/member-fields";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminModel, AdminField } from "@/lib/institutional/admin-config";
import { createRecord, updateRecord, uploadImageToSupabase } from "@/app/(gestao)/gestao/site/actions";
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  HelpCircle,
  Upload,
  ExternalLink,
  ImageIcon,
  FileText,
  Globe,
  Settings,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/institutional/ui/tooltip";
import { MarkdownEditor } from "@/components/institutional/markdown-editor";
import { toast } from "sonner";
import { useInstitutionalAsset } from "./site-context";
import { directoryPath } from "@/lib/institutional/routes";
import { cn } from "@/lib/utils";

function JsonArrayInput({
  value,
  onChange,
  schema,
}: {
  value: any;
  onChange: (val: any) => void;
  schema: { name: string; label: string; type: "string" | "text" }[];
}) {
  let items: any[] = [];
  try {
    items = Array.isArray(value)
      ? value
      : typeof value === "string" && value
      ? JSON.parse(value)
      : [];
  } catch (e) {
    items = [];
  }

  const handleAdd = () => {
    const newItem: Record<string, string> = {};
    schema.forEach((s) => (newItem[s.name] = ""));
    onChange([...items, newItem]);
  };

  const handleRemove = (idx: number) => {
    const newItems = [...items];
    newItems.splice(idx, 1);
    onChange(newItems);
  };

  const handleChange = (idx: number, key: string, val: string) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [key]: val };
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      {items.map((item: any, idx: number) => (
        <div
          key={idx}
          className="relative flex items-start gap-3 p-3.5 border border-border rounded-lg bg-card/60 transition-colors hover:border-hairline-strong"
        >
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {schema.map((s) => (
              <div key={s.name} className={s.type === "text" ? "sm:col-span-2" : ""}>
                <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                  {s.label}
                </label>
                {s.type === "text" ? (
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    value={item[s.name] || ""}
                    onChange={(e) => handleChange(idx, s.name, e.target.value)}
                    rows={2}
                  />
                ) : (
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    value={item[s.name] || ""}
                    onChange={(e) => handleChange(idx, s.name, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            className="text-red-400 hover:text-red-300 p-1.5 rounded-md hover:bg-red-500/10 transition-colors mt-4"
            title="Remover item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Adicionar item
      </button>
    </div>
  );
}

export function DynamicForm({
  config,
  initialData,
  isNew,
  tableSlug,
  projectsList,
  relationsData,
}: {
  config: AdminModel;
  initialData: any;
  isNew: boolean;
  tableSlug: string;
  projectsList?: any[];
  relationsData?: Record<string, any[]>;
}) {
  const router = useRouter();
  const assetUrl = useInstitutionalAsset();
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const values = initialData || Object.fromEntries(config.fields.filter(field => field.type === 'boolean').map(field => [field.name, false]));
    return config.table === 'member' ? { ...values, role: normalizeMemberRole(values.role || ''), teamId: values.teamId ?? '' } : values;
  });
  const [filesToUpload, setFilesToUpload] = useState<Record<string, File>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group fields into categories for clean tabbed navigation
  const translationFields = config.fields.filter(
    (f) => f.name.endsWith("En") || f.name.endsWith("Fr")
  );
  const imageFields = config.fields.filter(
    (f) =>
      f.type === "image" ||
      ["photo", "coverImage", "logo", "url", "image", "avatar"].includes(f.name)
  );
  const markdownFields = config.fields.filter(
    (f) =>
      f.type === "text" &&
      !f.name.endsWith("En") &&
      !f.name.endsWith("Fr")
  );
  const advancedFields = config.fields.filter(
    (f) => f.type === "json-array" || f.type === "multiselect" || f.type === "json"
  );
  const primaryFields = config.fields.filter(
    (f) =>
      !f.name.endsWith("En") &&
      !f.name.endsWith("Fr") &&
      f.type !== "image" &&
      !["photo", "coverImage", "logo", "url", "image", "avatar"].includes(f.name) &&
      f.type !== "json-array" &&
      f.type !== "multiselect" &&
      f.type !== "json" &&
      f.type !== "text"
  );

  const hasTabs =
    translationFields.length > 0 ||
    imageFields.length > 0 ||
    markdownFields.length > 0 ||
    advancedFields.length > 0;

  const [activeTab, setActiveTab] = useState<string>("primary");

  const handleChange = (field: AdminField, value: any) => {
    setFormData((prev) => ({ ...prev, [field.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const parsedData = Object.fromEntries(Object.entries(formData).filter(([key]) => config.fields.some(field => field.name === key) || (config.table === "member" && ["roleEn", "roleFr"].includes(key))));

    try {
      // 1. Upload pending files first
      for (const [fieldName, file] of Object.entries(filesToUpload)) {
        const fileData = new FormData();
        fileData.append("file", file);
        const uploadResult = await uploadImageToSupabase(fileData);
        if (!uploadResult?.success || !uploadResult?.url) {
          throw new Error(
            uploadResult?.error || `Falha ao fazer upload da imagem do campo ${fieldName}`
          );
        }
        parsedData[fieldName] = uploadResult.url;
      }

      // 2. Format and parse data
      for (const field of config.fields) {
        const val = parsedData[field.name];

        if (field.type === "json-array") {
          const rawVal = val;
          if (Array.isArray(rawVal)) {
            const cleanItems = rawVal.filter(
              (item: any) =>
                typeof item === "object" &&
                item !== null &&
                Object.values(item).some((v) => String(v).trim() !== "")
            );
            if (cleanItems.length > 0) {
              parsedData[field.name] = JSON.stringify(cleanItems);
            } else {
              parsedData[field.name] = field.required ? "[]" : null;
            }
          } else if (typeof rawVal === "string" && rawVal.trim() !== "") {
            try {
              const parsed = JSON.parse(rawVal);
              if (Array.isArray(parsed)) {
                const cleanItems = parsed.filter(
                  (item: any) =>
                    typeof item === "object" &&
                    item !== null &&
                    Object.values(item).some((v) => String(v).trim() !== "")
                );
                parsedData[field.name] =
                  cleanItems.length > 0
                    ? JSON.stringify(cleanItems)
                    : field.required
                    ? "[]"
                    : null;
              } else {
                parsedData[field.name] = rawVal;
              }
            } catch (e) {
              parsedData[field.name] = field.required ? "[]" : null;
            }
          } else {
            parsedData[field.name] = field.required ? "[]" : null;
          }
          continue;
        }

        if (val === undefined) continue;

        if (
          field.type === "number" ||
          field.type === "relation" ||
          (field.type === "select" && field.options?.some(option => typeof option.value === "number"))
        ) {
          if (val === "" || val === null) {
            parsedData[field.name] = null;
          } else {
            parsedData[field.name] = Number(val);
          }
        }

        if (field.type === "boolean") {
          parsedData[field.name] = val === "true" || val === true;
        }

        if (field.type === "json" && typeof val === "string" && val !== "") {
          try {
            JSON.parse(val);
          } catch (e) {
            throw new Error(`O campo ${field.label} contém JSON inválido.`);
          }
        }
      }

      // 3. Save to DB
      let result;
      if (isNew) {
        result = await createRecord(config.table, parsedData);
      } else {
        result = await updateRecord(config.table, initialData.id, parsedData);
      }

      if (!result?.success) {
        throw new Error(result?.error || "Erro ao salvar o registro no banco de dados.");
      }

      if (result.warning) toast.warning(result.warning);
      toast.success(
        isNew ? "Registro criado com sucesso!" : "Registro atualizado com sucesso!"
      );
      router.push(directoryPath(tableSlug));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro ao salvar o registro.");
      toast.error(err.message || "Falha ao salvar o registro.");
      setIsSaving(false);
    }
  };

  const renderField = (field: AdminField) => {
    const val = formData[field.name] ?? (field.type === "boolean" ? false : "");

    // Text / Markdown fields
    if (field.type === "text") {
      const isMarkdownCandidate =
        field.name === "details" ||
        field.name === "description" ||
        field.name === "bio" ||
        field.name.startsWith("details") ||
        field.name.startsWith("description") ||
        field.name.startsWith("bio");

      return (
        <div key={field.name} className="space-y-1.5 md:col-span-2">
          <label className="flex items-center text-xs font-semibold text-foreground">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
            {isMarkdownCandidate && (
              <span className="ml-2 font-mono text-[10px] text-primary border border-primary/30 bg-primary/10 px-1.5 py-0.2 rounded">
                Markdown .md
              </span>
            )}
            {field.description && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 ml-2 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-xs">
                    {field.description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </label>

          {isMarkdownCandidate ? (
            <MarkdownEditor
              value={val || ""}
              onChange={(newVal) => handleChange(field, newVal)}
              placeholder={`Escreva ${field.label.toLowerCase()} em Markdown (.md)...`}
              rows={field.name === "details" ? 8 : 4}
            />
          ) : (
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary min-h-[90px]"
              value={typeof val === "object" ? JSON.stringify(val, null, 2) : val}
              onChange={(e) => handleChange(field, e.target.value)}
              required={field.required}
            />
          )}
        </div>
      );
    }

    // JSON Arrays
    if (field.type === "json-array" && field.schema) {
      return (
        <div key={field.name} className="space-y-2 md:col-span-2">
          <label className="flex items-center text-xs font-semibold text-foreground">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
            {field.description && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 ml-2 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-xs">
                    {field.description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </label>
          <JsonArrayInput
            value={val}
            onChange={(newVal) => handleChange(field, newVal)}
            schema={field.schema}
          />
        </div>
      );
    }

    // Select dropdowns
    if (field.type === "select" && field.options) {
      const menu = selectOptions(field.options, val);
      const groups = [...new Set(menu.options.map(option => option.group).filter(Boolean))];
      return (
        <div key={field.name} className="space-y-1.5">
          <label htmlFor={`field-${tableSlug}-${field.name}`} className="flex items-center text-sm font-semibold text-foreground">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
            {field.description && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 ml-2 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-xs">
                    {field.description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </label>
          <select
            id={`field-${tableSlug}-${field.name}`}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
            value={val}
            onChange={(e) => handleChange(field, e.target.value)}
            required={field.required}
          >
            {menu.showPlaceholder && <option value="" disabled={field.required}>Selecione {field.label.toLowerCase()}…</option>}
            {menu.options.filter(option => !option.group).map(option => <option key={String(option.value)} value={option.value}>{option.label}</option>)}
            {groups.map(group => <optgroup key={group} label={group}>{menu.options.filter(option => option.group === group).map(option => <option key={String(option.value)} value={option.value}>{option.label}</option>)}</optgroup>)}
          </select>
          {field.name === 'teamId' && config.table === 'member' && <p className="text-xs leading-relaxed text-muted-foreground">Autônomos reúne integrantes sem vínculo com uma divisão específica.</p>}
        </div>
      );
    }

    // Relation selector
    if (field.type === "relation" && relationsData?.[field.name]) {
      return (
        <div key={field.name} className="space-y-1.5">
          <label className="flex items-center text-xs font-semibold text-foreground">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
            {field.description && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 ml-2 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-xs">
                    {field.description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </label>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
            value={val}
            onChange={(e) => handleChange(field, e.target.value)}
            required={field.required}
          >
            <option value="">Nenhum (Opcional)</option>
            {relationsData[field.name].map((opt: any) => {
              const label = opt.name || opt.title || opt.caption || opt.slug || `ID: ${opt.id}`;
              return (
                <option key={opt.id} value={opt.id}>
                  {label} (#{opt.id})
                </option>
              );
            })}
          </select>
        </div>
      );
    }

    // Multiselect projects
    if (field.type === "multiselect" && field.name === "projectIds") {
      let selectedArr: string[] = [];
      if (typeof val === "string") {
        try {
          selectedArr = JSON.parse(val) || [];
        } catch (e) {}
      } else if (Array.isArray(val)) {
        selectedArr = val;
      }

      return (
        <div key={field.name} className="space-y-2 md:col-span-2">
          <label className="flex items-center text-xs font-semibold text-foreground">
            {field.label}
            {field.description && (
              <span className="text-muted-foreground ml-2 font-normal text-[11px]">
                ({field.description})
              </span>
            )}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 border border-border rounded-lg bg-card/40 max-h-48 overflow-y-auto">
            {projectsList?.length ? (
              projectsList.map((proj) => {
                const isSelected = selectedArr.includes(proj.slug);
                return (
                  <label
                    key={proj.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border transition-colors cursor-pointer text-xs",
                      isSelected
                        ? "border-primary/50 bg-primary/10 text-primary font-medium"
                        : "border-border/60 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-border accent-primary"
                      checked={isSelected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        let newArr = [...selectedArr];
                        if (checked && !newArr.includes(proj.slug)) newArr.push(proj.slug);
                        else if (!checked) newArr = newArr.filter((slug) => slug !== proj.slug);
                        handleChange(field, JSON.stringify(newArr));
                      }}
                    />
                    <span className="truncate">{proj.name}</span>
                  </label>
                );
              })
            ) : (
              <span className="text-xs text-muted-foreground col-span-full">
                Nenhum projeto encontrado no banco de dados.
              </span>
            )}
          </div>
        </div>
      );
    }

    // Boolean toggle
    if (field.type === "boolean") {
      const isChecked = Boolean(val);
      const isGenderField = field.name === "isFemale";
      return (
        <div key={field.name} className="space-y-1.5">
          <label className="flex items-center text-xs font-semibold text-foreground">
            {field.label}
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={isChecked}
            aria-label={field.label}
            onClick={() => handleChange(field, !isChecked)}
            className={cn(
              "flex min-h-11 items-center gap-2 px-3 py-1.5 rounded-md border text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isChecked
                ? isGenderField
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-400 font-medium"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-medium"
                : "border-border bg-muted/40 text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isChecked ? (isGenderField ? "bg-rose-400" : "bg-emerald-400") : "bg-muted-foreground"
              )}
            />
            <span>
              {isGenderField
                ? isChecked
                  ? "Feminino (adapta Coordenadora, Diretora, etc.)"
                  : "Masculino (Coordenador, Diretor, etc.)"
                : field.name === "showOnSite"
                ? isChecked ? "Visível no site" : "Somente na gestão"
                : isChecked
                ? "Sim / Ativo"
                : "Não / Inativo"}
            </span>
          </button>
        </div>
      );
    }

    // Image upload field
    if (
      field.type === "image" ||
      ["photo", "coverImage", "logo", "url", "image", "avatar"].includes(field.name)
    ) {
      const currentUrl = val;
      const pendingFile = filesToUpload[field.name];
      const previewSrc = pendingFile ? URL.createObjectURL(pendingFile) : currentUrl;

      return (
        <div key={field.name} className="space-y-2 md:col-span-2">
          <label className="flex items-center text-xs font-semibold text-foreground">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
            {field.description && (
              <span className="text-muted-foreground ml-2 font-normal text-[11px]">
                ({field.description})
              </span>
            )}
          </label>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-border rounded-lg bg-card/40">
            {/* Thumbnail Preview */}
            <div className="relative flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {previewSrc ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetUrl(previewSrc)}
                    alt="Prévia"
                    className="h-full w-full object-cover"
                  />
                  {currentUrl && (
                    <a
                      href={assetUrl(currentUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      title="Abrir em tamanho real"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center text-muted-foreground/60 text-[10px]">
                  <ImageIcon className="h-6 w-6 mb-1" />
                  <span>Sem imagem</span>
                </div>
              )}
            </div>

            {/* Inputs & Actions */}
            <div className="flex-1 space-y-2 w-full">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="URL pública da imagem (ou envie um arquivo abaixo)..."
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-mono"
                  value={val || ""}
                  onChange={(e) => handleChange(field, e.target.value)}
                  required={field.required && !pendingFile}
                />
                {val && (
                  <button
                    type="button"
                    onClick={() => handleChange(field, "")}
                    className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Limpar URL"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{pendingFile ? "Trocar arquivo" : "Fazer Upload (Supabase)"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFilesToUpload((prev) => ({ ...prev, [field.name]: file }));
                      }
                    }}
                  />
                </label>

                {pendingFile && (
                  <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {pendingFile.name} (será enviado ao salvar)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default: string / number
    return (
      <div key={field.name} className="space-y-1.5">
        <label className="flex items-center text-xs font-semibold text-foreground">
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
          {field.description && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 ml-2 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs">
                  {field.description}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </label>
        <input
          type={field.type === "number" ? "number" : "text"}
          step={field.type === "number" ? "any" : undefined}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          value={val}
          onChange={(e) => handleChange(field, e.target.value)}
          required={field.required}
        />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs navigation for models with multiple sections */}
      {hasTabs && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("primary")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              activeTab === "primary"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>Principal (PT-BR)</span>
            <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-mono">
              {primaryFields.length}
            </span>
          </button>

          {markdownFields.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("markdown")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                activeTab === "markdown"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Conteúdo Rico (.md)</span>
              <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-mono">
                {markdownFields.length}
              </span>
            </button>
          )}

          {imageFields.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("images")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                activeTab === "images"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Mídia & Fotos</span>
              <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-mono">
                {imageFields.length}
              </span>
            </button>
          )}

          {translationFields.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("translations")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                activeTab === "translations"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Traduções (EN / FR)</span>
              <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-mono">
                {translationFields.length}
              </span>
            </button>
          )}

          {advancedFields.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("advanced")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                activeTab === "advanced"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Especificações & Dados</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono transition-colors ml-auto cursor-pointer",
              activeTab === "all"
                ? "bg-muted text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Ver todos ({config.fields.length})</span>
          </button>
        </div>
      )}

      {/* Fields Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {activeTab === "all"
          ? config.fields.map(renderField)
          : activeTab === "primary"
          ? primaryFields.map(renderField)
          : activeTab === "markdown"
          ? markdownFields.map(renderField)
          : activeTab === "images"
          ? imageFields.map(renderField)
          : activeTab === "translations"
          ? translationFields.map(renderField)
          : activeTab === "advanced"
          ? advancedFields.map(renderField)
          : config.fields.map(renderField)}
      </div>

      {/* Sticky Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-5">
        <span className="font-mono text-[11px] text-muted-foreground">
          {isNew ? "Novo registro não salvo" : `Editando #${initialData?.id}`}
        </span>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => router.push(directoryPath(tableSlug))}
            className="flex-1 sm:flex-none rounded-lg border border-border px-4 py-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{isSaving ? "Salvando no banco..." : isNew ? "Criar Registro" : "Salvar Alterações"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
