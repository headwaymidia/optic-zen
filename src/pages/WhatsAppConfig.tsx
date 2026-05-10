import { usePageTitle } from "@/hooks/usePageTitle";
import { useStores } from "@/hooks/useStores";
import { WhatsAppPanel } from "@/components/WhatsAppPanel";
import { ShieldOff } from "lucide-react";

export default function WhatsAppConfig() {
  usePageTitle("WhatsApp");
  const { currentStore } = useStores();

  if (!currentStore) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nenhuma loja selecionada.
      </div>
    );
  }

  const role = currentStore.role;
  const allowed = role === "Dono" || role === "Gerente";

  return (
    <div className="p-6 sm:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie a conexão do WhatsApp da sua loja
        </p>
      </div>

      {allowed ? (
        <WhatsAppPanel storeId={currentStore.id} role={role} />
      ) : (
        <div className="rounded-xl border bg-card p-6 flex items-start gap-3">
          <ShieldOff className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Acesso restrito</p>
            <p className="text-xs text-muted-foreground mt-1">
              Apenas o proprietário ou gerente da loja pode gerenciar a conexão com o WhatsApp.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
