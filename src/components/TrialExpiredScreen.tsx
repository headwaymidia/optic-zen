import { Lock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const SIGNUP_URL = "https://oticadominante.com.br";
const SUPPORT_WHATSAPP = "https://wa.me/5522974017994?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20minha%20assinatura";

export function TrialExpiredScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Seu período de teste de 14 dias encerrou.</h1>
          <p className="text-muted-foreground">
            Assine para continuar usando o CRM Ótica Dominante.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button asChild size="lg">
            <a href={SIGNUP_URL} target="_blank" rel="noopener noreferrer">
              Assinar agora
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar com suporte
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
