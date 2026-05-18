import { supabase } from "@/integrations/supabase/client";

const BUCKET = "whatsapp-media";

/**
 * Resolve uma media_url para uma URL acessível.
 * Bucket whatsapp-media é PÚBLICO — não usa signed URLs.
 * - URL https/http → retorna como está
 * - blob:/data: → retorna como está (preview otimista)
 * - path relativo → monta URL pública do bucket
 */
export function resolveMediaUrlSync(raw?: string | null): string | null {
  if (!raw) return null;
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(raw);
  return data?.publicUrl ?? null;
}

/** Mantido por compat: agora síncrono internamente. */
export async function resolveMediaUrl(
  raw: string | null | undefined,
): Promise<string | null> {
  return resolveMediaUrlSync(raw);
}

/** Hook que devolve a URL pública pronta para uso. */
export function useResolvedMediaUrl(raw?: string | null): string | null {
  return resolveMediaUrlSync(raw);
}

/** Mantido por compat — não é mais usado para signed URLs. */
export function extractStoragePath(raw: string): string | null {
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return raw;
  const marker = "/storage/v1/object/";
  const idx = raw.indexOf(marker);
  if (idx === -1) return null;
  let after = raw.slice(idx + marker.length).split("?")[0];
  after = after.replace(/^(public|sign|authenticated)\//, "");
  if (!after.startsWith(`${BUCKET}/`)) return null;
  try {
    return decodeURIComponent(after.slice(BUCKET.length + 1));
  } catch {
    return after.slice(BUCKET.length + 1);
  }
}
