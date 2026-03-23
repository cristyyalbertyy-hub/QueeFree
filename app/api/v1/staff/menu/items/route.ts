import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/staff-auth-api";

const bodySchema = z.object({
  venueSlug: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable(),
  priceCents: z.number().int().min(0).max(100_000_000),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(request: Request) {
  const unauthorized = await requireStaffSession(request);
  if (unauthorized) return unauthorized;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({
    where: { slug: parsed.data.venueSlug },
  });
  if (!venue) {
    return NextResponse.json({ error: "Local não encontrado" }, { status: 404 });
  }

  const category = await prisma.menuCategory.findFirst({
    where: { id: parsed.data.categoryId, venueId: venue.id },
  });
  if (!category) {
    return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
  }

  const item = await prisma.menuItem.create({
    data: {
      venueId: venue.id,
      categoryId: category.id,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      imageUrl: parsed.data.imageUrl?.trim() || null,
      priceCents: parsed.data.priceCents,
      isAvailable: parsed.data.isAvailable ?? true,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  return NextResponse.json({
    id: item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    priceCents: item.priceCents,
    isAvailable: item.isAvailable,
    sortOrder: item.sortOrder,
  });
}
