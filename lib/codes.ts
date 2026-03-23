/** Gera código curto tipo A37 (charset sem ambiguidade comum) */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";

export function randomPublicCode(): string {
  const letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]!;
  const d1 = DIGITS[Math.floor(Math.random() * DIGITS.length)]!;
  const d2 = DIGITS[Math.floor(Math.random() * DIGITS.length)]!;
  return `${letter}${d1}${d2}`;
}
