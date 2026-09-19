export async function fetchJson<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {...init, cache: 'no-store', signal: AbortSignal.timeout(20000)});
  const raw = await response.text();
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { throw new Error(`Servis geçerli JSON döndürmedi (${response.status}).`); }
  if (!response.ok) throw new Error(String(body.error || body.detail || body.message || `Servis hatası: ${response.status}`));
  return body as T;
}

export function parseRequestJson(raw: string): unknown {
  if (!raw.trim()) throw new Error('İstek verisi eksik. Sayfayı yenileyip tekrar deneyin.');
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error('İstek verisi geçersiz. Sayfayı yenileyip tekrar deneyin.');
  }
}
