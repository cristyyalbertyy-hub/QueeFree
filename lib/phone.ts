import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

/**
 * Aceita número em formato internacional ou nacional + país ISO2.
 * Devolve E.164 (ex: +351912345678, +447911123456) ou null se inválido.
 */
export function normalizeToE164(
  raw: string,
  defaultCountry?: CountryCode
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;

  return parsed.number; // E.164
}

/**
 * Para UI: mostrar número de forma legível no país de origem (quando possível).
 */
export function formatForDisplay(e164: string, defaultCountry?: CountryCode) {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;
  return parsed.formatInternational();
}
