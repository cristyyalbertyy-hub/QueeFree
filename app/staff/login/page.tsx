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
        setError(data.error ?? "Erro ao entrar");
        return;
      }
      router.replace("/staff");
      router.refresh();
    } catch {
      setError("Falha de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <p className="text-sm uppercase tracking-widest text-zinc-500">
          Área staff
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Entrar</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Palavra-passe definida no servidor (<code className="text-zinc-300">STAFF_PASSWORD</code>).
        </p>
      </div>

      {configError && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          Falta configurar <code>STAFF_JWT_SECRET</code> (e <code>STAFF_PASSWORD</code>) no ficheiro{" "}
          <code>.env</code>.
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-400">Palavra-passe</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
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
          className="rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "A entrar…" : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/" className="underline hover:text-zinc-300">
          Voltar ao início
        </Link>
      </p>
    </main>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-zinc-400">A carregar…</p>}>
      <LoginForm />
    </Suspense>
  );
}
