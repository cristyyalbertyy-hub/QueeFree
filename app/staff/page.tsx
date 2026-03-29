"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type OrderRow = {
  id: string;
  publicCode: string;
  status: string;
  totalCents: number;
  phoneE164: string;
  notes: string | null;
  items: { name: string; quantity: number }[];
};

const STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "picked_up",
  "cancelled",
] as const;

export default function StaffPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/staff/orders?venue=demo", {
      credentials: "include",
    });
    const data = (await res.json()) as {
      error?: string;
      venue?: { currency: string };
      orders?: OrderRow[];
    };
    if (res.status === 401) {
      router.replace("/staff/login");
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Erro");
      setLoading(false);
      return;
    }
    setCurrency(data.venue?.currency ?? "EUR");
    setOrders(data.orders ?? []);
    setError(null);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8000);
    return () => clearInterval(id);
  }, [load]);

  async function setStatus(orderId: string, status: (typeof STATUSES)[number]) {
    const res = await fetch("/api/v1/staff/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venue: "demo", orderId, status }),
      credentials: "include",
    });
    if (res.status === 401) {
      router.replace("/staff/login");
      return;
    }
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Erro");
      return;
    }
    setError(null);
    void load();
  }

  async function logout() {
    await fetch("/api/v1/staff/logout", {
      method: "POST",
      credentials: "include",
    });
    router.replace("/staff/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm tabular-nums text-zinc-500">{currency}</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/staff/menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-700/50 bg-emerald-950/30 text-lg text-emerald-300 hover:bg-emerald-950/50"
            aria-label="Editar menu"
            title="Menu"
          >
            ☰
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 text-xl text-zinc-300 hover:bg-zinc-800"
            aria-label="Atualizar lista"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 text-xl text-zinc-300 hover:bg-zinc-800"
            aria-label="Sair"
          >
            ⎋
          </button>
          <Link
            href="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 text-xl text-zinc-300 hover:bg-zinc-800"
            aria-label="Entrada cliente"
          >
            ⌂
          </Link>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && orders.length === 0 ? (
        <p className="text-zinc-500" aria-live="polite">
          …
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {o.publicCode}
                  </p>
                  <p className="text-xs text-zinc-500">{o.phoneE164}</p>
                  <p className="mt-1 text-sm tabular-nums text-zinc-400">
                    {(o.totalCents / 100).toFixed(2)} {currency} · {o.status}
                  </p>
                  {o.notes && (
                    <p className="mt-2 text-sm text-amber-200/90">{o.notes}</p>
                  )}
                  <ul className="mt-2 text-sm text-zinc-300">
                    {o.items.map((it, i) => (
                      <li key={i}>
                        {it.quantity}× {it.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="sr-only">Estado</label>
                  <select
                    value={o.status}
                    onChange={(e) =>
                      void setStatus(
                        o.id,
                        e.target.value as (typeof STATUSES)[number]
                      )
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-white"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
