import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token em falta" }, { status: 400 });
  }

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
  });

  if (!session) {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
  }

  const order = await prisma.order.findFirst({
    where: {
      venueId: session.venueId,
      publicCode: code.toUpperCase(),
      sessionId: session.id,
    },
    include: {
      items: { include: { menuItem: true } },
      venue: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    publicCode: order.publicCode,
    status: order.status,
    totalCents: order.totalCents,
    currency: order.venue.currency,
    notes: order.notes,
    items: order.items.map((i) => ({
      name: i.menuItem.name,
      quantity: i.quantity,
      lineTotalCents: i.lineTotalCents,
    })),
    updatedAt: order.updatedAt.toISOString(),
  });
}
