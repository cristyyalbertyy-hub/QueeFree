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
        setError(data.error ?? "Erro ao registar");
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
      setError("Falha de rede. Tenta de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-400">País (para números sem +)</span>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        >
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label} ({c.code})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-400">Telemóvel</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+351 912 345 678 ou nacional"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white placeholder:text-zinc-600"
        />
      </label>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "A enviar…" : "Continuar"}
      </button>
    </form>
  );
}
