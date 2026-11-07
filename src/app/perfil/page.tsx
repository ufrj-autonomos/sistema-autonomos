"use client";

import { ImageCropDialog } from '@/components/institutional/image-crop-dialog';
import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  LockKeyhole,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { MEMBER_AREAS, normalizeMemberArea } from "@/lib/member-fields";
import { useSession } from "@/contexts/auth-context";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: string;
  area: string;
  phone: string;
  dre: string;
  cpf: string;
  birthDate: string;
  course: string;
  academicPeriod: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  profileCompletedAt: string | null;
  institutionalMemberId: number | null;
};

type SiteProfileData = {
  id: number;
  name: string;
  role: string;
  area: string;
  bio: string;
  photo: string;
  course: string;
  linkedin: string;
  github: string;
  instagram: string;
  isFemale: boolean;
  joinedYear: string;
  teamName: string;
  showOnSite: boolean;
} | null;

type PendingChangeData = {
  id: string;
  createdAt: string;
  changes: Record<string, unknown>;
} | null;

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-hidden focus:border-border focus:ring-1 focus:ring-ring disabled:opacity-50";

function ProfileFormContent() {
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";
  const { refreshSession } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropPhoto, setCropPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [siteProfile, setSiteProfile] = useState<SiteProfileData>(null);
  const [pendingChange, setPendingChange] = useState<PendingChangeData>(null);

  // Form states
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [dre, setDre] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [course, setCourse] = useState("");
  const [academicPeriod, setAcademicPeriod] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Site-bound fields
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [instagram, setInstagram] = useState("");
  const [isFemale, setIsFemale] = useState(false);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar perfil.");

      const p: ProfileData = data.profile;
      const sp: SiteProfileData = data.siteProfile;
      const pc: PendingChangeData = data.pendingChange;
      const pendingFields = (pc?.changes || {}) as Record<string, unknown>;

      setProfile(p);
      setSiteProfile(sp);
      setPendingChange(pc);

      setName(typeof pendingFields.name === "string" ? pendingFields.name : p.name || sp?.name || "");
      setArea(normalizeMemberArea(p.area) || normalizeMemberArea(sp?.area) || "");
      setPhone(p.phone || "");
      setDre(p.dre || "");
      setCpf(p.cpf || "");
      setBirthDate(p.birthDate || "");
      setCourse(
        typeof pendingFields.course === "string"
          ? pendingFields.course
          : p.course || sp?.course || ""
      );
      setAcademicPeriod(p.academicPeriod || "");
      setEmergencyContactName(p.emergencyContactName || "");
      setEmergencyContactPhone(p.emergencyContactPhone || "");

      setBio(typeof pendingFields.bio === "string" ? pendingFields.bio : sp?.bio || "");
      setPhoto(typeof pendingFields.photo === "string" ? pendingFields.photo : sp?.photo || "");
      setLinkedin(
        typeof pendingFields.linkedin === "string" ? pendingFields.linkedin : sp?.linkedin || ""
      );
      setGithub(
        typeof pendingFields.github === "string" ? pendingFields.github : sp?.github || ""
      );
      setInstagram(
        typeof pendingFields.instagram === "string"
          ? pendingFields.instagram
          : sp?.instagram || ""
      );
      setIsFemale(
        typeof pendingFields.isFemale === "boolean"
          ? pendingFields.isFemale
          : Boolean(sp?.isFemale)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar perfil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 25 * 1024 * 1024) { setError('Escolha uma imagem de até 25 MB.'); return; }
    setCropPhoto(file);
  }
  async function uploadCroppedPhoto(file: File) {
    setUploadingPhoto(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível enviar a foto.");
      setPhoto(data.url);
      setCropPhoto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar foto.");
      throw err;
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          area,
          phone,
          dre,
          cpf,
          birthDate,
          course,
          academicPeriod,
          emergencyContactName,
          emergencyContactPhone,
          bio,
          photo,
          linkedin,
          github,
          instagram,
          isFemale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar seu perfil.");
      setSuccessMessage(data.message || "Perfil salvo com sucesso!");
      await refreshSession();
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-secondary-foreground" />
        <p className="mt-3 text-sm">Carregando seu perfil de integrante...</p>
      </div>
    );
  }

  const pendingKeys = pendingChange ? Object.keys(pendingChange.changes || {}) : [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar ao início</span>
        </Link>
        {siteProfile && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono ${
              siteProfile.showOnSite
                ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-800"
                : "bg-muted text-muted-foreground border border-border"
            }`}
            title="Apenas a gestão pode alterar a exibição no site institucional"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                siteProfile.showOnSite ? "bg-emerald-400" : "bg-muted-foreground"
              }`}
            />
            {siteProfile.showOnSite ? "Visível no site institucional" : "Oculto no site (controlado pela gestão)"}
          </span>
        )}
      </div>

      <header className="border-b border-border pb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Meu Perfil de Integrante
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Mantenha suas informações operacionais atualizadas e personalize sua apresentação para o site institucional da UFRJ Autônomos.
        </p>
      </header>

      {(isWelcome || !profile?.profileCompletedAt) && (
        <div className="mt-6 rounded-xl border border-cyan-500/30 bg-cyan-100 dark:bg-cyan-950/20 p-4 text-sm text-cyan-700 dark:text-cyan-200 flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-cyan-700 dark:text-cyan-400 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Bem-vindo(a) à plataforma da UFRJ Autônomos!</p>
            <p className="mt-1 text-secondary-foreground leading-relaxed">
              Como este é o seu primeiro acesso, preencha seus dados obrigatórios (Telefone, Curso, DRE e Contato de Emergência) e suas informações para o site. A opção de aparecer ou não no site é gerenciada exclusivamente pela Gestão.
            </p>
          </div>
        </div>
      )}

      {pendingKeys.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-100 dark:bg-amber-950/20 p-4 text-sm text-amber-700 dark:text-amber-200 flex items-start gap-3">
          <Clock className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-100">
              Alterações do site aguardando aprovação da Gestão
            </p>
            <p className="mt-1 text-secondary-foreground leading-relaxed">
              Você possui alterações pendentes para publicação no site institucional nos campos:{" "}
              <strong className="text-amber-700 dark:text-amber-200">{pendingKeys.join(", ")}</strong>. Seus dados internos já estão salvos na tabela da equipe.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300 flex items-start gap-3"
        >
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-700 dark:text-red-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-3"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {cropPhoto && <ImageCropDialog file={cropPhoto} profile onCancel={() => setCropPhoto(null)} onConfirm={uploadCroppedPhoto} />}
      <form onSubmit={handleSubmit} className="mt-8 space-y-10">
        {/* Seção 1: Dados Internos & Operacionais */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3 border-b border-border pb-4">
            <LockKeyhole className="h-5 w-5 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                1. Cadastro Interno e Operacional
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Estes dados são privados da equipe e salvos imediatamente. A data de nascimento nunca é exibida no site (apenas sua idade é calculada e atualizada automaticamente no seu aniversário).
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-foreground">
              Email de Login (vinculado ao diretório)
              <input
                type="email"
                value={profile?.email || ""}
                disabled
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Telefone / WhatsApp <span className="text-amber-700 dark:text-amber-400">*</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(21) 99999-9999"
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Curso na UFRJ <span className="text-amber-700 dark:text-amber-400">*</span>
              <input
                type="text"
                required
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="Ex.: Engenharia de Controle e Automação"
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              DRE <span className="text-amber-700 dark:text-amber-400">*</span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={dre}
                onChange={(e) => setDre(e.target.value)}
                placeholder="Ex.: 123456789"
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Período Acadêmico
              <input
                type="text"
                value={academicPeriod}
                onChange={(e) => setAcademicPeriod(e.target.value)}
                placeholder="Ex.: 5º período"
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Área na Equipe
              <select
                value={area}
                required
                onChange={(e) => setArea(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>Selecione sua área</option>
                {area && !MEMBER_AREAS.some(value => value === area) && <option value={area}>{area} (área atual)</option>}
                {MEMBER_AREAS.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium text-foreground">
              CPF
              <input
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Data de Nascimento (opcional — calcula idade no site)
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="border-t border-input pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Contato de Emergência <span className="text-amber-700 dark:text-amber-400">*</span>
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">
                Nome do Contato de Emergência <span className="text-amber-700 dark:text-amber-400">*</span>
                <input
                  type="text"
                  required
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Nome completo e parentesco"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium text-foreground">
                Telefone de Emergência <span className="text-amber-700 dark:text-amber-400">*</span>
                <input
                  type="tel"
                  required
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="(21) 98888-8888"
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        </section>

        {/* Seção 2: Dados Públicos do Site Institucional */}
        <section className="rounded-2xl border border-input bg-card p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3 border-b border-border pb-4">
            <Globe className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                2. Apresentação no Site Institucional
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Alterações nestes campos são registradas na tabela de integrantes e enviadas para aprovação de um membro da Gestão antes de irem ao ar no site público. A tradução para inglês e francês é feita automaticamente na aprovação.
              </p>
            </div>
          </div>

          {/* Foto de Perfil */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="h-20 w-20 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {photo ? (
                <img
                  src={photo}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Camera className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-xs font-medium text-foreground hover:bg-accent">
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Enviando foto...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      <span>{photo ? 'Trocar foto' : 'Enviar e recortar foto'}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>
                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto('')}
                    disabled={uploadingPhoto}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-accent cursor-pointer"
                  >
                    Remover foto
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Original até 25 MB; envio até 4 MB após o recorte.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            <label className="block text-sm font-medium text-foreground">
              Nome de Exibição <span className="text-amber-700 dark:text-amber-400">*</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Biografia (em Português — traduzida automaticamente para EN/FR após aprovação)
              <textarea
                rows={4}
                maxLength={2000}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte brevemente sobre sua atuação na equipe, interesses em robótica e formação..."
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              LinkedIn
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/seu-perfil"
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              GitHub
              <input
                type="url"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/seu-usuario"
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Instagram
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/seu-perfil"
                className={inputClass}
              />
            </label>

            <div className="flex items-center pt-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={isFemale}
                  onChange={(e) => setIsFemale(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-zinc-100"
                />
                <span>Adaptar cargo no site para o feminino (ex.: Diretora / Pesquisadora)</span>
              </label>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-4">
          <button
            type="submit"
            disabled={saving || uploadingPhoto}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Salvar Perfil</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted-foreground">
          Carregando...
        </div>
      }
    >
      <ProfileFormContent />
    </Suspense>
  );
}

