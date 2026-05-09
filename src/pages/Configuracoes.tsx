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
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import { Sun, Moon, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserInitials, translateRole } from "@/lib/profile-helpers";

export default function Configuracoes() {
  const { user } = useAuth();
  const { currentStoreId } = useStores();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initialAvatar, setInitialAvatar] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [saving, setSaving] = useState(false);
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

  // Carrega nome da loja
  useEffect(() => {
    if (!currentStoreId) return;
    supabase
      .from("stores")
      .select("name")
      .eq("id", currentStoreId)
      .maybeSingle()
      .then(({ data }) => setStoreName(data?.name ?? ""));
  }, [currentStoreId]);

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

  async function handleSave() {
    if (!user?.id) return;
    const trimmed = fullName.trim();
    if (!trimmed) {
      toast({ title: "Informe seu nome", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmed, avatar_url: avatarUrl })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setInitialName(trimmed);
    setInitialAvatar(avatarUrl);
    toast({ title: "Alterações salvas com sucesso." });
  }

  const dirty = fullName.trim() !== initialName.trim() || avatarUrl !== initialAvatar;
  const initials = getUserInitials(fullName, user?.email);


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
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Função</Label>
            <Input value={translateRole(role)} readOnly />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!dirty || saving}>
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
    </div>
  );
}
