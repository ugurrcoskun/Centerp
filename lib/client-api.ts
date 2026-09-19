export async function readApiJson<T>(response: Response, fallback = 'Sunucudan geçerli bir yanıt alınamadı.'): Promise<T> {
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); }
    catch { throw new Error(response.ok ? fallback : `Sunucu hatası (${response.status}). Lütfen sayfayı yenileyip tekrar deneyin.`); }
  }
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body ? String(body.error) : `Sunucu isteği başarısız (${response.status}).`;
    throw new Error(message);
  }
  if (body === null) throw new Error(fallback);
  return body as T;
}

export async function fetchApiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  try {
    return await readApiJson<T>(await fetch(input, {...init, signal: init?.signal || AbortSignal.timeout(20000)}));
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Centerp sunucusuna ulaşılamadı. Sayfayı yenileyip tekrar deneyin.');
    if (error instanceof DOMException && ['AbortError', 'TimeoutError'].includes(error.name)) throw new Error('Sunucu yanıtı zaman aşımına uğradı. Bağlantınızı kontrol edip tekrar deneyin.');
    throw error;
  }
}
