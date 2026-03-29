"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configError = searchParams.get("error") === "config";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erro");
        return;
      }
      router.replace("/staff");
      router.refresh();
    } catch {
      setError("Rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-12">
      {configError && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          Falta <code className="text-amber-100">.env</code> (staff). Vê instruções (?).
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
      >
        <label className="flex flex-col gap-1">
          <span className="sr-only">Palavra-passe</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-white"
            placeholder="••••"
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
          className="rounded-lg bg-emerald-600 px-4 py-3 text-lg font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          aria-label={loading ? "A entrar" : "Entrar"}
        >
          {loading ? "…" : "→"}
        </button>
      </form>

      <p className="text-center">
        <Link
          href="/"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 text-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Entrada cliente"
        >
          ←
        </Link>
      </p>
    </main>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-center text-zinc-400" aria-live="polite">
          …
        </p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
