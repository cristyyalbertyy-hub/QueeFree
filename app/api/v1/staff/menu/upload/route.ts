import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  extensionForMime,
  validateMenuImageFile,
} from "@/lib/menu-upload-shared";
import { requireStaffSession } from "@/lib/staff-auth-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = await requireStaffSession(request);
  if (unauthorized) return unauthorized;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Ficheiro em falta" }, { status: 400 });
  }

  const valid = validateMenuImageFile(file);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  const mime = (file.type || "").toLowerCase();
  const ext = extensionForMime(mime);
  if (!ext) {
    return NextResponse.json(
      { error: "Tipo não permitido. Usa JPG, PNG, WebP ou GIF." },
      { status: 400 }
    );
  }

  const filename = `${randomUUID()}${ext}`;
  const pathname = `menu/${filename}`;

  /** Com token Vercel Blob → URL pública persistente (recomendado em produção). */
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(pathname, file, {
        access: "public",
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return NextResponse.json(
        { url: blob.url, storage: "blob" as const },
        { status: 200 }
      );
    } catch (e) {
      console.error("[upload] Vercel Blob:", e);
      return NextResponse.json(
        { error: "Falha ao enviar para o armazenamento na cloud." },
        { status: 502 }
      );
    }
  }

  /** Sem Blob: grava em `public/menu/` (ideal para desenvolvimento local). */
  const buf = Buffer.from(await file.arrayBuffer());
  const dir = join(process.cwd(), "public", "menu");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), buf);

  const url = `/menu/${filename}`;
  return NextResponse.json({ url, storage: "local" as const });
}
