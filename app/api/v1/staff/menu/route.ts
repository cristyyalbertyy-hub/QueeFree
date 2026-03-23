import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/staff-auth-api";

const querySchema = z.object({
  venue: z.string().min(1).default("demo"),
});

export async function GET(request: Request) {
  const unauthorized = await requireStaffSession(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    venue: searchParams.get("venue") ?? "demo",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Query inválida" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({
    where: { slug: parsed.data.venue },
  });
  if (!venue) {
    return NextResponse.json({ error: "Local não encontrado" }, { status: 404 });
  }

  const categories = await prisma.menuCategory.findMany({
    where: { venueId: venue.id },
    orderBy: { sortOrder: "asc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({
    venue: {
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      currency: venue.currency,
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      items: c.items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        imageUrl: i.imageUrl,
        priceCents: i.priceCents,
        isAvailable: i.isAvailable,
        sortOrder: i.sortOrder,
      })),
    })),
  });
}
