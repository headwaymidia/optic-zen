import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function Configuracoes() {
  const { profile, user } = useAuth();
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (!profile?.company_id) return;
    supabase
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .maybeSingle()
      .then(({ data }) => setCompanyName(data?.name ?? ""));
  }, [profile?.company_id]);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Informações da sua conta e empresa.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={profile?.name ?? ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Função</Label>
            <Input value={profile?.role ?? "—"} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Empresa</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da empresa</Label>
            <Input value={companyName} readOnly />
          </div>
          <div className="space-y-2">
            <Label>ID da empresa</Label>
            <Input value={profile?.company_id ?? ""} readOnly className="font-mono text-xs" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
