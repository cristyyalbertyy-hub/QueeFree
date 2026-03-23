import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/staff-auth-api";

const patchSchema = z.object({
  venueSlug: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireStaffSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({
    where: { slug: parsed.data.venueSlug },
  });
  if (!venue) {
    return NextResponse.json({ error: "Local não encontrado" }, { status: 404 });
  }

  const existing = await prisma.menuCategory.findFirst({
    where: { id, venueId: venue.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }

  const updated = await prisma.menuCategory.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.sortOrder !== undefined
        ? { sortOrder: parsed.data.sortOrder }
        : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    sortOrder: updated.sortOrder,
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireStaffSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const venueSlug = new URL(request.url).searchParams.get("venueSlug");
  if (!venueSlug) {
    return NextResponse.json(
      { error: "Query venueSlug obrigatório" },
      { status: 400 }
    );
  }

  const venue = await prisma.venue.findUnique({
    where: { slug: venueSlug },
  });
  if (!venue) {
    return NextResponse.json({ error: "Local não encontrado" }, { status: 404 });
  }

  const existing = await prisma.menuCategory.findFirst({
    where: { id, venueId: venue.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }

  await prisma.menuCategory.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
