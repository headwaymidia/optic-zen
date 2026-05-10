import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { Sun, Moon, Loader2, Upload, X } from "lucide-react";
import { validateName } from "@/lib/validators";
import { cn } from "@/lib/utils";
import { getUserInitials, translateRole } from "@/lib/profile-helpers";
import { TeamPanel } from "@/pages/ConfiguracoesLoja";

export default function Configuracoes() {
  const { user } = useAuth();
  const { currentStoreId, currentStore, refetch: refetchStores } = useStores();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [initialName, setInitialName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initialAvatar, setInitialAvatar] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeCity, setStoreCity] = useState("");
  const [storeState, setStoreState] = useState("");
  const [storeTeamSize, setStoreTeamSize] = useState("");
  const [initialStore, setInitialStore] = useState({ name: "", city: "", state: "", team_size: "" });
  const [saving, setSaving] = useState(false);
  const [savingStore, setSavingStore] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Carrega profile (full_name + avatar_url)
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const n = data?.full_name ?? "";
        const a = (data as { avatar_url?: string | null } | null)?.avatar_url ?? null;
        setFullName(n);
        setInitialName(n);
        setAvatarUrl(a);
        setInitialAvatar(a);
      });
  }, [user?.id]);

  // Carrega função na loja atual
  useEffect(() => {
    if (!user?.id || !currentStoreId) return;
    supabase
      .from("store_members")
      .select("role")
      .eq("store_id", currentStoreId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setRole(data?.role ?? null));
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
    toast({ title: "Configurações da loja salvas." });
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
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmed, avatar_url: avatarUrl })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: humanizeError(error), variant: "destructive" });
      return;
    }
    setInitialName(trimmed);
    setInitialAvatar(avatarUrl);
    toast({ title: "Alterações salvas com sucesso." });
  }

  const dirty = fullName.trim() !== initialName.trim() || avatarUrl !== initialAvatar;
  const initials = getUserInitials(fullName, user?.email);
  const normalizedRole = (role ?? "").toLowerCase();
  const canEditStore = ["dono", "owner", "proprietário", "proprietario", "gerente", "manager"].includes(normalizedRole);
  const storeDirty =
    storeName.trim() !== initialStore.name.trim() ||
    storeCity.trim() !== (initialStore.city ?? "").trim() ||
    storeState.trim() !== (initialStore.state ?? "").trim() ||
    (storeTeamSize ?? "") !== (initialStore.team_size ?? "");

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Informações da sua conta e empresa.</p>
      </div>

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
            <Label>Função</Label>
            <Input value={translateRole(role) || "—"} readOnly />
            <p className="text-[11px] text-muted-foreground">Definido pelo dono da loja.</p>
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
        <CardHeader><CardTitle className="text-base">Empresa</CardTitle></CardHeader>
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

      {canEditStore && (
        <Card>
          <CardHeader><CardTitle className="text-base">Configurações da Loja</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Nome da loja</Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Nome da loja"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="store-city">Cidade</Label>
                <Input
                  id="store-city"
                  value={storeCity}
                  onChange={(e) => setStoreCity(e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-state">Estado</Label>
                <Input
                  id="store-state"
                  value={storeState}
                  onChange={(e) => setStoreState(e.target.value)}
                  placeholder="UF"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tamanho da equipe</Label>
              <Select value={storeTeamSize || undefined} onValueChange={setStoreTeamSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2 a 5">2 a 5</SelectItem>
                  <SelectItem value="6 a 10">6 a 10</SelectItem>
                  <SelectItem value="Mais de 10">Mais de 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveStore} disabled={!storeDirty || savingStore}>
                {savingStore && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar configurações da loja
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canEditStore && currentStoreId && (
        <Card>
          <CardHeader><CardTitle className="text-base">Equipe</CardTitle></CardHeader>
          <CardContent>
            <TeamPanel storeId={currentStoreId} storesCount={1} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
