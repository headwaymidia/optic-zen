import { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, Profile } from "@/integrations/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Ultimo usuario visto — para so reagir a MUDANCA real de usuario.
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      const uid = s?.user?.id ?? null;

      // Mantem o MESMO objeto de sessao quando e o mesmo usuario (ex.: evento
      // TOKEN_REFRESHED disparado ao voltar para a aba). Antes, cada evento criava
      // um objeto novo -> todos os consumidores re-renderizavam e seus efeitos
      // re-rodavam (recarregando lojas/leads) -> a tela "resetava" e o usuario
      // perdia o ponto onde estava ao trocar de aba e voltar.
      setSession((prev) => {
        if (prev && uid && prev.user?.id === uid) return prev;
        return s;
      });

      // Perfil so e rebuscado quando o usuario realmente muda (login/logout).
      if (uid !== lastUserIdRef.current) {
        lastUserIdRef.current = uid;
        if (uid) {
          setTimeout(() => { fetchProfile(uid); }, 0);
        } else {
          setProfile(null);
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      lastUserIdRef.current = s?.user?.id ?? null;
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("Erro ao buscar profile:", error);
      return;
    }
    setProfile(data as Profile | null);
  }

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    lastUserIdRef.current = null;
  }, []);

  const user = session?.user ?? null;
  // Memoizado: sem isto, cada render criava um objeto de contexto novo e
  // re-disparava efeitos de quem consome useAuth().
  const value = useMemo(
    () => ({ session, user, profile, loading, signOut }),
    [session, user, profile, loading, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
