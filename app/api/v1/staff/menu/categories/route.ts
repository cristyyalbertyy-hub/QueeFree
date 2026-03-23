import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/staff-auth-api";

const bodySchema = z.object({
  venueSlug: z.string().min(1),
  name: z.string().min(1).max(120),
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

  const cat = await prisma.menuCategory.create({
    data: {
      venueId: venue.id,
      name: parsed.data.name.trim(),
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  return NextResponse.json({
    id: cat.id,
    name: cat.name,
    sortOrder: cat.sortOrder,
  });
}
