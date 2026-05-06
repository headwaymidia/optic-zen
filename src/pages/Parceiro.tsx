import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Handshake, DollarSign, RefreshCw, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";

const HOW_OPTIONS = [
  "Sou consultor de óticas",
  "Tenho uma ótica e vou indicar parceiros",
  "Sou gestor de tráfego",
  "Outro",
] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido").max(20),
  email: z.string().trim().email("E-mail inválido").max(255),
  how: z.enum(HOW_OPTIONS),
});

const BENEFITS = [
  {
    icon: DollarSign,
    title: "30% de comissão",
    desc: "Ganhe 30% do valor pago por cada ótica que você indicar, todo mês.",
  },
  {
    icon: RefreshCw,
    title: "Pagamento recorrente",
    desc: "Enquanto o cliente continuar ativo, você continua recebendo.",
  },
  {
    icon: BarChart3,
    title: "Painel de indicações",
    desc: "Acompanhe seus indicados e comissões em tempo real.",
  },
];

export default function Parceiro() {
  const { user } = useAuth();
  const { currentStoreId } = useStores();
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", how: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos");
      return;
    }
    if (!user) {
      toast.error("Faça login para continuar");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("partner_requests").insert({
      user_id: user.id,
      store_id: currentStoreId,
      name: parsed.data.name,
      whatsapp: parsed.data.whatsapp,
      email: parsed.data.email,
      how: parsed.data.how,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Erro ao enviar cadastro: " + error.message);
      return;
    }
    setDone(true);
    toast.success("Cadastro enviado! Entraremos em contato pelo WhatsApp em até 24h.");
  }

  return (
    <div className="min-h-full p-6 md:p-10 bg-background">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Handshake className="h-7 w-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Seja um parceiro Ótica Dominante
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Indique o CRM para outras óticas e ganhe comissão recorrente por cada cliente ativo.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-4">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="p-5 space-y-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </Card>
          ))}
        </div>

        <Card className="p-6 md:p-8">
          {done ? (
            <div className="text-center space-y-3 py-6">
              <h2 className="text-xl font-semibold">Cadastro enviado!</h2>
              <p className="text-muted-foreground">
                Entraremos em contato pelo WhatsApp em até 24h.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-xl font-semibold">Cadastre-se como parceiro</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={form.name}
                    maxLength={100}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={form.whatsapp}
                    maxLength={20}
                    placeholder="(11) 99999-9999"
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  maxLength={255}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Como você pretende indicar?</Label>
                <Select value={form.how} onValueChange={(v) => setForm({ ...form, how: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOW_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Enviando..." : "Quero ser parceiro"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
