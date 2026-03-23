import { NextResponse } from "next/server";
import { z } from "zod";
import type { CountryCode } from "libphonenumber-js";
import { prisma } from "@/lib/prisma";
import { normalizeToE164 } from "@/lib/phone";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { randomBytes } from "node:crypto";

const bodySchema = z.object({
  phone: z.string().min(5),
  countryCode: z.string().length(2).optional(),
});

function sessionExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Telefone ou país inválidos" },
      { status: 400 }
    );
  }

  const { phone, countryCode } = parsed.data;
  const defaultCountry = (countryCode?.toUpperCase() ?? "PT") as CountryCode;

  const e164 = normalizeToE164(phone, defaultCountry);
  if (!e164) {
    return NextResponse.json(
      { error: "Número de telefone inválido para o país escolhido" },
      { status: 400 }
    );
  }

  const venue = await prisma.venue.findUnique({ where: { slug } });
  if (!venue) {
    return NextResponse.json({ error: "Local não encontrado" }, { status: 404 });
  }

  const token = randomBytes(32).toString("hex");

  const customer = await prisma.customer.upsert({
    where: {
      venueId_phoneE164: { venueId: venue.id, phoneE164: e164 },
    },
    create: { venueId: venue.id, phoneE164: e164 },
    update: {},
  });

  await prisma.session.create({
    data: {
      venueId: venue.id,
      customerId: customer.id,
      token,
      expiresAt: sessionExpiry(),
    },
  });

  const origin = new URL(request.url).origin;
  const menuPath = `/menu?token=${encodeURIComponent(token)}`;
  const menuUrl = `${origin}${menuPath}`;

  await sendWhatsAppMessage({
    toE164: e164,
    body: `Olá! Faz aqui o teu pedido (sem fila no balcão): ${menuUrl}\n\nSe o link não abrir, copia e cola no browser.`,
  });

  return NextResponse.json({
    token,
    menuUrl,
    expiresInHours: 24,
  });
}
