import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/staff-auth-api";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const querySchema = z.object({
  venue: z.string().min(1).default("demo"),
  status: z.nativeEnum(OrderStatus).optional(),
});

export async function GET(request: Request) {
  const unauthorized = await requireStaffSession(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    venue: searchParams.get("venue") ?? "demo",
    status: searchParams.get("status") ?? undefined,
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

  const where = {
    venueId: venue.id,
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      items: { include: { menuItem: true } },
      customer: true,
    },
  });

  return NextResponse.json({
    venue: { name: venue.name, slug: venue.slug, currency: venue.currency },
    orders: orders.map((o) => ({
      id: o.id,
      publicCode: o.publicCode,
      status: o.status,
      totalCents: o.totalCents,
      notes: o.notes,
      phoneE164: o.customer.phoneE164,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        name: i.menuItem.name,
        quantity: i.quantity,
      })),
    })),
  });
}

const patchBodySchema = z.object({
  venue: z.string().min(1).default("demo"),
  orderId: z.string().min(1),
  status: z.nativeEnum(OrderStatus),
});

export async function PATCH(request: Request) {
  const unauthorized = await requireStaffSession(request);
  if (unauthorized) return unauthorized;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({
    where: { slug: parsed.data.venue },
  });
  if (!venue) {
    return NextResponse.json({ error: "Local não encontrado" }, { status: 404 });
  }

  const existing = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, venueId: venue.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const order = await prisma.order.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
    include: { customer: true, venue: true },
  });

  if (parsed.data.status === OrderStatus.ready) {
    await sendWhatsAppMessage({
      toE164: order.customer.phoneE164,
      body: `O teu pedido *${order.publicCode}* está pronto. Podes levantar no balcão.`,
    });
  }

  return NextResponse.json({
    id: order.id,
    publicCode: order.publicCode,
    status: order.status,
  });
}
