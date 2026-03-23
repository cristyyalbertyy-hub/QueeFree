/**
 * Lê JSON da resposta sem rebentar se o corpo estiver vazio ou for HTML (ex.: erro 500).
 */
export async function readJsonSafe<T>(
  res: Response
): Promise<{ data: T | null; empty: boolean; parseError: boolean }> {
  const text = await res.text();
  if (!text.trim()) {
    return { data: null, empty: true, parseError: false };
  }
  try {
    return { data: JSON.parse(text) as T, empty: false, parseError: false };
  } catch {
    return { data: null, empty: false, parseError: true };
  }
}
