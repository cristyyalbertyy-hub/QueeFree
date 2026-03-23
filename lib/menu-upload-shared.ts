/** Partilhado entre upload local e Vercel Blob */

export const MENU_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const MENU_ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function validateMenuImageFile(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size === 0) {
    return { ok: false, error: "Ficheiro vazio" };
  }
  if (file.size > MENU_UPLOAD_MAX_BYTES) {
    return {
      ok: false,
      error: "Ficheiro demasiado grande (máx. 5 MB)",
    };
  }
  const mime = (file.type || "").toLowerCase();
  if (!MENU_ALLOWED_MIME[mime]) {
    return {
      ok: false,
      error: "Tipo não permitido. Usa JPG, PNG, WebP ou GIF.",
    };
  }
  return { ok: true };
}

export function extensionForMime(mime: string): string | null {
  return MENU_ALLOWED_MIME[(mime || "").toLowerCase()] ?? null;
}
