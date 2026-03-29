"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRY_OPTIONS } from "@/lib/countries";

const DEFAULT_VENUE_SLUG = "demo";

export function JoinForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("PT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/venues/${DEFAULT_VENUE_SLUG}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, countryCode: country }),
      });
      const data = (await res.json()) as {
        error?: string;
        token?: string;
        menuUrl?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Erro");
        return;
      }
      if (data.menuUrl) {
        router.push(data.menuUrl);
        return;
      }
      if (data.token) {
        router.push(`/menu?token=${encodeURIComponent(data.token)}`);
      }
    } catch {
      setError("Rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
    >
      <label className="flex flex-col gap-2">
        <span className="sr-only">País</span>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          aria-label="País do número de telefone"
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
        >
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label} ({c.code})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="sr-only">Telemóvel</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Telemóvel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          aria-label="Número de telemóvel"
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-600"
        />
      </label>

      {error ? (
        <p className="text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        aria-label={loading ? "A enviar" : "Continuar"}
        className="flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 text-lg font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "…" : "→"}
      </button>
    </form>
  );
}
