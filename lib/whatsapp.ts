/**
 * Envio WhatsApp — liga ao teu provedor (Twilio, 360dialog, Meta Cloud API).
 * Em desenvolvimento, só regista na consola.
 */

type SendWhatsAppParams = {
  toE164: string;
  body: string;
};

export async function sendWhatsAppMessage({
  toE164,
  body,
}: SendWhatsAppParams): Promise<{ ok: boolean; providerId?: string }> {
  if (process.env.NODE_ENV === "development" && !process.env.WHATSAPP_FORCE_SEND) {
    console.info("[WhatsApp DEV — não enviado]", { to: toE164, body });
    return { ok: true, providerId: "dev-log" };
  }

  // TODO: integrar Twilio / Meta / 360dialog
  // Exemplo Twilio (pseudo):
  // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  // const msg = await client.messages.create({ from: WHATSAPP_FROM, to: `whatsapp:${toE164}`, body });
  // return { ok: true, providerId: msg.sid };

  console.warn("[WhatsApp] WHATSAPP_FORCE_SEND sem implementação de provedor");
  return { ok: false };
}
