import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/staff-auth-api";

const patchSchema = z.object({
  venueSlug: z.string().min(1),
  categoryId: z.string().min(1).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable(),
  priceCents: z.number().int().min(0).max(100_000_000).optional(),
  isAvailable: z.boolean().optional(),
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

  const existing = await prisma.menuItem.findFirst({
    where: { id, venueId: venue.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  if (parsed.data.categoryId) {
    const cat = await prisma.menuCategory.findFirst({
      where: { id: parsed.data.categoryId, venueId: venue.id },
    });
    if (!cat) {
      return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
    }
  }

  const updated = await prisma.menuItem.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.categoryId !== undefined
        ? { categoryId: parsed.data.categoryId }
        : {}),
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description?.trim() || null }
        : {}),
      ...(parsed.data.imageUrl !== undefined
        ? { imageUrl: parsed.data.imageUrl?.trim() || null }
        : {}),
      ...(parsed.data.priceCents !== undefined
        ? { priceCents: parsed.data.priceCents }
        : {}),
      ...(parsed.data.isAvailable !== undefined
        ? { isAvailable: parsed.data.isAvailable }
        : {}),
      ...(parsed.data.sortOrder !== undefined
        ? { sortOrder: parsed.data.sortOrder }
        : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    imageUrl: updated.imageUrl,
    priceCents: updated.priceCents,
    isAvailable: updated.isAvailable,
    sortOrder: updated.sortOrder,
    categoryId: updated.categoryId,
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

  const existing = await prisma.menuItem.findFirst({
    where: { id, venueId: venue.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  await prisma.menuItem.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
