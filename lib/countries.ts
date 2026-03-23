import type { CountryCode } from "libphonenumber-js";

/** Lista curta para MVP — expande conforme necessário */
export const COUNTRY_OPTIONS: { code: CountryCode; label: string }[] = [
  { code: "PT", label: "Portugal" },
  { code: "ES", label: "Espanha" },
  { code: "FR", label: "França" },
  { code: "DE", label: "Alemanha" },
  { code: "GB", label: "Reino Unido" },
  { code: "IE", label: "Irlanda" },
  { code: "BR", label: "Brasil" },
  { code: "US", label: "Estados Unidos" },
  { code: "CA", label: "Canadá" },
  { code: "AO", label: "Angola" },
  { code: "MZ", label: "Moçambique" },
  { code: "CV", label: "Cabo Verde" },
  { code: "CH", label: "Suíça" },
  { code: "NL", label: "Países Baixos" },
  { code: "BE", label: "Bélgica" },
  { code: "IT", label: "Itália" },
];
