import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomPublicCode } from "@/lib/codes";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const bodySchema = z.object({
  token: z.string().min(10),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados do pedido inválidos" },
      { status: 400 }
    );
  }

  const { token, notes, items: lineItems } = parsed.data;

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    include: { venue: true, customer: true },
  });

  if (!session) {
    return NextResponse.json(
      { error: "Sessão inválida ou expirada" },
      { status: 401 }
    );
  }

  const menuIds = [...new Set(lineItems.map((l) => l.menuItemId))];
  const menuRows = await prisma.menuItem.findMany({
    where: {
      id: { in: menuIds },
      venueId: session.venueId,
      isAvailable: true,
    },
  });

  if (menuRows.length !== menuIds.length) {
    return NextResponse.json(
      { error: "Um ou mais itens não estão disponíveis" },
      { status: 400 }
    );
  }

  const priceById = new Map(menuRows.map((m) => [m.id, m.priceCents]));

  let totalCents = 0;
  const resolvedLines: {
    menuItemId: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }[] = [];

  for (const line of lineItems) {
    const unit = priceById.get(line.menuItemId);
    if (unit === undefined) {
      return NextResponse.json(
        { error: "Item inválido" },
        { status: 400 }
      );
    }
    const lineTotal = unit * line.quantity;
    totalCents += lineTotal;
    resolvedLines.push({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      unitPriceCents: unit,
      lineTotalCents: lineTotal,
    });
  }

  let publicCode = "";
  const maxAttempts = 15;
  for (let i = 0; i < maxAttempts; i++) {
    publicCode = randomPublicCode();
    try {
      const order = await prisma.$transaction(async (tx) => {
        return tx.order.create({
          data: {
            venueId: session.venueId,
            customerId: session.customerId,
            sessionId: session.id,
            publicCode,
            totalCents,
            notes: notes ?? null,
            status: "pending",
            items: {
              create: resolvedLines.map((l) => ({
                menuItemId: l.menuItemId,
                quantity: l.quantity,
                unitPriceCents: l.unitPriceCents,
                lineTotalCents: l.lineTotalCents,
              })),
            },
          },
        });
      });

      await sendWhatsAppMessage({
        toE164: session.customer.phoneE164,
        body: `Pedido registado: código *${order.publicCode}*. Total: ${(order.totalCents / 100).toFixed(2)} ${session.venue.currency}. Avisamos aqui quando estiver pronto.`,
      });

      return NextResponse.json({
        orderId: order.id,
        publicCode: order.publicCode,
        totalCents: order.totalCents,
        currency: session.venue.currency,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        continue; // colisão em publicCode
      }
      throw e;
    }
  }

  return NextResponse.json(
    { error: "Não foi possível gerar código único. Tenta outra vez." },
    { status: 503 }
  );
}
