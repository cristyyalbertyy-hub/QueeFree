import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token em falta" }, { status: 400 });
  }

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    include: {
      venue: true,
    },
  });

  if (!session) {
    return NextResponse.json(
      { error: "Sessão inválida ou expirada. Volta à entrada e regista o número." },
      { status: 401 }
    );
  }

  const categories = await prisma.menuCategory.findMany({
    where: { venueId: session.venueId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return NextResponse.json({
    venue: {
      name: session.venue.name,
      slug: session.venue.slug,
      currency: session.venue.currency,
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      items: c.items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        imageUrl: i.imageUrl,
        priceCents: i.priceCents,
      })),
    })),
  });
}
