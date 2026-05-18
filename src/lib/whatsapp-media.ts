import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "whatsapp-media";
const STORAGE_MARKER = "/storage/v1/object/";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 ano

/**
 * Extrai o path relativo do arquivo no bucket whatsapp-media a partir de uma
 * URL completa do Supabase Storage. Retorna:
 * - o próprio valor se já for path relativo (não-https)
 * - o path se for URL do nosso bucket
 * - null se for URL externa (ex: mídia hospedada pelo WhatsApp)
 */
export function extractStoragePath(raw: string): string | null {
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return raw; // já é path
  const idx = raw.indexOf(STORAGE_MARKER);
  if (idx === -1) return null;
  const after = raw.slice(idx + STORAGE_MARKER.length);
  const re = new RegExp(`^(?:public|sign|authenticated)\\/${BUCKET}\\/([^?]+)`);
  const m = after.match(re);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Resolve uma media_url armazenada no banco para uma URL acessível.
 * - path relativo ou URL do nosso bucket → gera signed URL (1 ano)
 * - URL externa (https que não é do nosso bucket) → retorna como está
 * - blob:/data: → retorna como está (preview otimista)
 */
export async function resolveMediaUrl(
  raw: string | null | undefined,
): Promise<string | null> {
  if (!raw) return null;
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;
  const path = extractStoragePath(raw);
  if (path === null) return raw; // externa
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) {
    console.warn("[whatsapp-media] falha ao assinar", path, error);
    return null;
  }
  return data.signedUrl;
}

// Cache em memória — signed URLs valem 1 ano, evita re-assinar a cada render.
const urlCache = new Map<string, string>();

/** Hook que resolve uma media_url de forma assíncrona, com cache. */
export function useResolvedMediaUrl(raw?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!raw) return null;
    if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;
    return urlCache.get(raw) ?? null;
  });

  useEffect(() => {
    if (!raw) {
      setUrl(null);
      return;
    }
    if (raw.startsWith("blob:") || raw.startsWith("data:")) {
      setUrl(raw);
      return;
    }
    const cached = urlCache.get(raw);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    resolveMediaUrl(raw).then((resolved) => {
      if (cancelled || !resolved) return;
      urlCache.set(raw, resolved);
      setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [raw]);

  return url;
}
