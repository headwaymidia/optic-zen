import { useEffect, useRef, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/components/ui/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { Sun, Moon, Loader2, Upload, X } from "lucide-react";
import { validateName } from "@/lib/validators";
import { cn } from "@/lib/utils";
import { getUserInitials, translateRole } from "@/lib/profile-helpers";
import { TeamPanel } from "@/pages/ConfiguracoesLoja";
import { StoreSellersManager } from "@/components/StoreSellersManager";
import ConfiguracoesLojaContent from "@/pages/ConfiguracoesLojaContent";

const ROLE_OPTIONS = ["Dono", "Gerente", "Vendedor"] as const;
function normalizeRole(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (["dono", "owner", "proprietário", "proprietario"].includes(v)) return "Dono";
  if (["gerente", "manager"].includes(v)) return "Gerente";
  if (["vendedor", "vendedora", "consultor", "consultora", "atendente", "attendant"].includes(v)) return "Vendedor";
  return null;
}

export default function Configuracoes() {
  usePageTitle("Configurações");
  const [activeTab, setActiveTab] = useState<"pessoal" | "loja">("pessoal");
  const { user } = useAuth();
  const { currentStoreId, currentStore, loading: storesLoading, refetch: refetchStores } = useStores();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [initialName, setInitialName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initialAvatar, setInitialAvatar] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [initialRole, setInitialRole] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeCity, setStoreCity] = useState("");
  const [storeState, setStoreState] = useState("");
  const [storeTeamSize, setStoreTeamSize] = useState("");
  const [initialStore, setInitialStore] = useState({ name: "", city: "", state: "", team_size: "" });
  const [saving, setSaving] = useState(false);
  const [savingStore, setSavingStore] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Carrega profile (full_name + avatar_url + role)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, role")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[Configuracoes] erro ao carregar profile:", error);
        return;
      }
      console.info("[Configuracoes] profile carregado:", data);
      const n = data?.full_name ?? "";
      const a = (data as { avatar_url?: string | null } | null)?.avatar_url ?? null;
      const r = normalizeRole((data as { role?: string | null } | null)?.role ?? null);
      setFullName(n);
      setInitialName(n);
      setAvatarUrl(a);
      setInitialAvatar(a);
      setRole(r);
      setInitialRole(r);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Carrega função na loja atual (fallback se profile.role estiver vazio)
  useEffect(() => {
    if (!user?.id || !currentStoreId) return;
    supabase
      .from("store_members")
      .select("role")
      .eq("store_id", currentStoreId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const r = normalizeRole(data?.role ?? null);
        if (r) {
          setRole((prev) => prev ?? r);
          setInitialRole((prev) => prev ?? r);
        }
      });
  }, [user?.id, currentStoreId]);

  // Carrega dados da loja
  useEffect(() => {
    if (!currentStoreId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("name, city, state, team_size")
        .eq("id", currentStoreId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[Configuracoes] erro ao carregar loja:", error);
        toast({ title: "Erro ao carregar loja", description: humanizeError(error), variant: "destructive" });
        return;
      }
      const row = (data ?? {}) as { name?: string | null; city?: string | null; state?: string | null; team_size?: string | null };
      const name = row.name ?? currentStore?.name ?? "";
      const city = row.city ?? "";
      const state = row.state ?? "";
      const team_size = row.team_size ?? "";
      setStoreName(name);
      setStoreCity(city);
      setStoreState(state);
      setStoreTeamSize(team_size);
      setInitialStore({ name, city, state, team_size });
    })();
    return () => {
      cancelled = true;
    };
  }, [currentStoreId, currentStore?.name]);

  async function handleSaveStore() {
    if (!currentStoreId) return;
    const trimmed = storeName.trim();
    if (!trimmed) {
      toast({ title: "Informe o nome da loja", variant: "destructive" });
      return;
    }
    setSavingStore(true);
    const { error } = await supabase
      .from("stores")
      .update({
        name: trimmed,
        city: storeCity.trim() || null,
        state: storeState.trim() || null,
        team_size: storeTeamSize || null,
      })
      .eq("id", currentStoreId);
    setSavingStore(false);
    if (error) {
      console.error("[Configuracoes] erro ao salvar loja:", error);
      toast({ title: "Erro ao salvar loja", description: humanizeError(error), variant: "destructive" });
      return;
    }
    setInitialStore({ name: trimmed, city: storeCity.trim(), state: storeState.trim(), team_size: storeTeamSize });
    // Atualiza imediatamente o nome da loja no seletor do sidebar
    await refetchStores();
    toast({ title: "Configurações salvas!" });
  }

  function handlePickFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione uma imagem", variant: "destructive" });
      return;
    }
    if (file.size > 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo 1MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  const nameError = validateName(fullName);

  async function handleSave() {
    if (!user?.id) return;
    if (nameError) {
      setNameTouched(true);
      return;
    }
    const trimmed = fullName.trim();
    setSaving(true);
    // upsert garante que cria a linha se ela não existir (fallback ao trigger)
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, full_name: trimmed, avatar_url: avatarUrl, role: role },
        { onConflict: "id" }
      );
    setSaving(false);
    if (error) {
      console.error("[Configuracoes] erro ao salvar profile:", error);
      toast({ title: "Erro ao salvar", description: humanizeError(error), variant: "destructive" });
      return;
    }
    setInitialName(trimmed);
    setInitialAvatar(avatarUrl);
    setInitialRole(role);
    toast({ title: "Configurações salvas!" });
  }

  const dirty =
    fullName.trim() !== initialName.trim() ||
    avatarUrl !== initialAvatar ||
    (role ?? "") !== (initialRole ?? "");
  const initials = getUserInitials(fullName, user?.email);
  const normalizedRole = (role ?? "").toLowerCase();
  const storeRole = (currentStore?.role ?? "").toLowerCase();
  const editRoles = ["dono", "owner", "proprietário", "proprietario", "gerente", "manager"];
  const canEditStore = !storesLoading && (editRoles.includes(normalizedRole) || editRoles.includes(storeRole));
  const storeDirty =
    storeName.trim() !== initialStore.name.trim() ||
    storeCity.trim() !== (initialStore.city ?? "").trim() ||
    storeState.trim() !== (initialStore.state ?? "").trim() ||
    (storeTeamSize ?? "") !== (initialStore.team_size ?? "");

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Informações da sua conta e empresa.</p>
      </div>

      {canEditStore && (
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("pessoal")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${activeTab === "pessoal" ? "bg-primary text-primary-foreground" : "text-muted-foreground bg-background hover:bg-muted"}`}
          >
            Configurações
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("loja")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-border ${activeTab === "loja" ? "bg-primary text-primary-foreground" : "text-muted-foreground bg-background hover:bg-muted"}`}
          >
            Configurações da loja
          </button>
        </div>
      )}

      {activeTab === "pessoal" && <>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aparência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Escolha como o CRM deve ser exibido. Sua preferência é salva neste navegador.
          </p>
          <RadioGroup
            value={theme}
            onValueChange={(v) => setTheme(v as "light" | "dark")}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {[
              { value: "light", label: "Modo Claro", icon: Sun, hint: "Padrão · ideal para o dia" },
              { value: "dark", label: "Modo Escuro", icon: Moon, hint: "Midnight · reduz cansaço visual" },
            ].map((opt) => {
              const active = theme === opt.value;
              return (
                <Label
                  key={opt.value}
                  htmlFor={`theme-${opt.value}`}
                  className={cn(
                    "relative flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <RadioGroupItem
                    id={`theme-${opt.value}`}
                    value={opt.value}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <opt.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{opt.hint}</p>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || "Avatar"} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-base font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePickFile(e.target.files?.[0])}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />
                  Trocar foto
                </Button>
                {avatarUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl(null)}>
                    <X className="h-3.5 w-3.5" />
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">PNG ou JPG, até 1MB.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome completo</Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="Seu nome"
              aria-invalid={nameTouched && !!nameError}
              className={
                nameTouched && nameError
                  ? "border-destructive focus-visible:ring-destructive"
                  : undefined
              }
            />
            {nameTouched && nameError && (
              <p className="text-[11px] text-destructive">{nameError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-role">Função</Label>
            <Select value={role ?? undefined} onValueChange={(v) => setRole(v)}>
              <SelectTrigger id="profile-role">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dono">Dono</SelectItem>
                <SelectItem value="Gerente">Gerente</SelectItem>
                <SelectItem value="Vendedor">Vendedor</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Como você atua na loja.</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!dirty || saving || !!nameError}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da empresa</Label>
            <Input value={storeName} readOnly />
          </div>
          <div className="space-y-2">
            <Label>ID da empresa</Label>
            <Input value={currentStoreId ?? ""} readOnly className="font-mono text-xs" />
          </div>

        </CardContent>
      </Card>


    </> /* fim aba pessoal */}

      {/* Aba: Configurações da loja */}
      {activeTab === "loja" && canEditStore && currentStoreId && (
        <LojaInlineContent storeId={currentStoreId} store={currentStore!} />
      )}

    </div>
  );
}

function LojaInlineContent({ storeId, store }: { storeId: string; store: { id: string; name: string; role: string } }) {
  return (
    <div className="space-y-6">
      <GeneralPanelInline store={store} />
      <TeamPanel storeId={storeId} storesCount={1} />
      <StoreSellersManager storeId={storeId} />
    </div>
  );
}

function GeneralPanelInline({ store }: { store: { id: string; name: string; role: string } }) {
  const [bhStart, setBhStart] = useState<number>(8);
  const [bhEnd, setBhEnd] = useState<number>(18);
  const [bhDays, setBhDays] = useState<number[]>([1,2,3,4,5,6]);
  const [savingBh, setSavingBh] = useState(false);
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [savingPixel, setSavingPixel] = useState(false);
  const canEdit = store.role === "Dono" || store.role === "Gerente";

  useEffect(() => {
    supabase.from("stores")
      .select("business_hours_start,business_hours_end,business_days,meta_pixel_id,meta_access_token")
      .eq("id", store.id).maybeSingle().then(({ data }) => {
        if (data) {
          setBhStart((data as any).business_hours_start ?? 8);
          setBhEnd((data as any).business_hours_end ?? 18);
          setBhDays((data as any).business_days ?? [1,2,3,4,5,6]);
          setPixelId((data as any).meta_pixel_id ?? "");
          setAccessToken((data as any).meta_access_token ?? "");
        }
      });
  }, [store.id]);

  const dayNames = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Horário de Atendimento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4 sm:items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Abertura</label>
              <select value={bhStart} onChange={e => setBhStart(Number(e.target.value))} disabled={!canEdit}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                {Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,"0")}h00</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Fechamento</label>
              <select value={bhEnd} onChange={e => setBhEnd(Number(e.target.value))} disabled={!canEdit}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                {Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,"0")}h00</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Dias de atendimento</label>
            <div className="flex gap-2 flex-wrap">
              {dayNames.map((d,i) => (
                <button key={i} type="button" disabled={!canEdit}
                  onClick={() => setBhDays(prev => prev.includes(i) ? prev.filter(x=>x!==i) : [...prev,i].sort())}
                  className={`h-8 w-10 rounded-md text-xs font-medium border transition-colors ${bhDays.includes(i) ? "bg-emerald-500 text-white border-emerald-500" : "bg-background text-muted-foreground border-input"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          {canEdit && (
            <button type="button" disabled={savingBh}
              onClick={async () => { setSavingBh(true); await supabase.from("stores").update({business_hours_start:bhStart,business_hours_end:bhEnd,business_days:bhDays} as any).eq("id",store.id); setSavingBh(false); toast({title:"Horário salvo"}); }}
              className="h-9 px-4 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50">
              {savingBh ? "Salvando..." : "Salvar horário"}
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Meta Pixel / Conversions API</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Pixel ID</label>
            <input type="text" placeholder="Ex: 1234567890123456" value={pixelId} onChange={e=>setPixelId(e.target.value)} disabled={!canEdit}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"/>
            <p className="text-[10px] text-muted-foreground">Gerenciador de Negócios → Fontes de Dados → Pixels</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Token de Acesso (Conversions API)</label>
            <input type="password" placeholder="EAAxxxxxxxx..." value={accessToken} onChange={e=>setAccessToken(e.target.value)} disabled={!canEdit}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"/>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Eventos disparados:</p>
            <p>• <strong>Lead</strong> — novo lead chega • <strong>Schedule</strong> — agenda exame • <strong>Purchase</strong> — compra</p>
          </div>
          {canEdit && (
            <button type="button" disabled={savingPixel}
              onClick={async () => { setSavingPixel(true); await supabase.from("stores").update({meta_pixel_id:pixelId||null,meta_access_token:accessToken||null} as any).eq("id",store.id); setSavingPixel(false); toast({title:"Pixel salvo"}); }}
              className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
              {savingPixel ? "Salvando..." : "Salvar configuração"}
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

