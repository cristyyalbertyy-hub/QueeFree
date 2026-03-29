"use client";

import Image from "next/image";

function menuImageUnoptimized(src: string) {
  return (
    src.startsWith("/") ||
    src.includes("public.blob.vercel-storage.com")
  );
}
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readJsonSafe } from "@/lib/read-json";

type MenuJson = {
  venue: { name: string; slug: string; currency: string };
  categories: {
    id: string;
    name: string;
    items: {
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      priceCents: number;
    }[];
  }[];
};

type CartLine = { menuItemId: string; name: string; quantity: number; unitCents: number };

export function MenuView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [menu, setMenu] = useState<MenuJson | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<{
    publicCode: string;
    totalCents: number;
    currency: string;
  } | null>(null);

  async function loadMenu() {
    if (!token) return;
    let res: Response;
    try {
      res = await fetch(`/api/v1/menu?token=${encodeURIComponent(token)}`);
    } catch {
      setLoadError("Sem ligação ao servidor. Verifica se o site está a correr (npm run dev).");
      return;
    }

    const { data, empty, parseError } = await readJsonSafe<
      MenuJson & { error?: string }
    >(res);

    if (parseError) {
      setLoadError("Resposta inválida do servidor. Tenta atualizar a página.");
      return;
    }
    if (empty || !data) {
      setLoadError(
        res.ok
          ? "Menu vazio. Tenta apagar a pasta .next e reiniciar (npm run dev)."
          : `Erro ${res.status}` + (res.statusText ? ` (${res.statusText})` : "")
      );
      return;
    }
    if (!res.ok) {
      setLoadError(data.error ?? "Erro ao carregar menu");
      return;
    }
    setMenu(data);
  }

  useEffect(() => {
    void loadMenu();
  }, [token]);

  const totals = useMemo(() => {
    let total = 0;
    for (const line of Object.values(cart)) {
      total += line.unitCents * line.quantity;
    }
    return total;
  }, [cart]);

  const cartItemCount = useMemo(
    () =>
      Object.values(cart).reduce((n, line) => n + line.quantity, 0),
    [cart]
  );

  const flatItems = useMemo(() => {
    if (!menu) return [];
    return menu.categories.flatMap((cat) => cat.items);
  }, [menu]);

  function addQty(line: CartLine, delta: number) {
    const nextQty = line.quantity + delta;
    if (nextQty <= 0) {
      setCart((prev) => {
        const copy = { ...prev };
        delete copy[line.menuItemId];
        return copy;
      });
      return;
    }
    setCart((prev) => ({
      ...prev,
      [line.menuItemId]: { ...line, quantity: nextQty },
    }));
  }

  function addItem(item: {
    id: string;
    name: string;
    priceCents: number;
    imageUrl?: string | null;
  }) {
    setCart((prev) => {
      const existing = prev[item.id];
      if (existing) {
        return {
          ...prev,
          [item.id]: { ...existing, quantity: existing.quantity + 1 },
        };
      }
      return {
        ...prev,
        [item.id]: {
          menuItemId: item.id,
          name: item.name,
          quantity: 1,
          unitCents: item.priceCents,
        },
      };
    });
  }

  const pollOrder = useCallback(
    async (code: string) => {
      if (!token) return;
      const res = await fetch(
        `/api/v1/orders/${encodeURIComponent(code)}?token=${encodeURIComponent(token)}`
      );
      if (!res.ok) return null;
      const { data, parseError, empty } = await readJsonSafe<{ status: string }>(
        res
      );
      if (parseError || empty || !data) return null;
      return data.status;
    },
    [token]
  );

  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!orderResult || !token) return;
    let cancelled = false;
    const t = setInterval(async () => {
      const s = await pollOrder(orderResult.publicCode);
      if (!cancelled && s) setOrderStatus(s);
    }, 4000);
    void pollOrder(orderResult.publicCode).then((s) => {
      if (!cancelled && s) setOrderStatus(s);
    });
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [orderResult, token, pollOrder]);

  async function submitOrder() {
    if (!token) return;
    const items = Object.values(cart).map((l) => ({
      menuItemId: l.menuItemId,
      quantity: l.quantity,
    }));
    if (items.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, notes: notes || undefined, items }),
      });
      const { data, parseError, empty } = await readJsonSafe<{
        error?: string;
        publicCode?: string;
        totalCents?: number;
        currency?: string;
      }>(res);
      if (parseError) {
        setSubmitError("Resposta inválida do servidor.");
        return;
      }
      if (empty || !data) {
        setSubmitError(
          res.ok ? "Resposta vazia do servidor." : `Erro ${res.status}` + (res.statusText ? ` (${res.statusText})` : "")
        );
        return;
      }
      if (!res.ok) {
        setSubmitError(data.error ?? "Erro ao enviar pedido");
        return;
      }
      if (data.publicCode && data.totalCents != null && data.currency) {
        setOrderResult({
          publicCode: data.publicCode,
          totalCents: data.totalCents,
          currency: data.currency,
        });
        setCart({});
        setNotes("");
      }
    } catch {
      setSubmitError("Falha de rede.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <main className="menu-page-bg flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
        <p className="mb-4 text-sm text-zinc-500" role="alert">
          Link inválido
        </p>
        <Link
          href="/"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-2xl text-emerald-300 transition hover:bg-emerald-500/20"
          aria-label="Voltar ao início"
        >
          ←
        </Link>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="menu-page-bg flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="max-w-sm text-sm text-red-400/90" role="alert">
          {loadError}
        </p>
        <Link
          href="/"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-2xl text-emerald-300"
          aria-label="Voltar ao início"
        >
          ←
        </Link>
      </main>
    );
  }

  if (!menu) {
    return (
      <main className="menu-page-bg min-h-screen px-4 pb-40 pt-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-zinc-800/80" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex gap-4 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30 p-3"
              >
                <div className="h-28 w-28 shrink-0 animate-pulse rounded-xl bg-zinc-800/80" />
                <div className="flex flex-1 flex-col justify-center gap-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800/80" />
                  <div className="h-3 w-full animate-pulse rounded bg-zinc-800/60" />
                  <div className="h-4 w-20 animate-pulse rounded bg-zinc-800/60" />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-zinc-500" aria-live="polite">
            …
          </p>
        </div>
      </main>
    );
  }

  if (orderResult) {
    return (
      <main className="menu-page-bg flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/40 to-zinc-950/80 p-8 text-center shadow-2xl shadow-emerald-900/20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl">
            ✓
          </div>
          <p
            className="mt-2 font-mono text-5xl font-bold tracking-widest text-emerald-400"
            aria-live="polite"
          >
            {orderResult.publicCode}
          </p>
          <p className="mt-4 text-lg font-semibold text-zinc-200 tabular-nums">
            {(orderResult.totalCents / 100).toFixed(2)}{" "}
            <span className="text-base font-medium text-zinc-400">
              {orderResult.currency}
            </span>
          </p>
          <div className="mt-8 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
            <p className="text-lg font-medium capitalize text-white">
              {orderStatus ?? "…"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="menu-page-bg min-h-screen pb-[22rem] sm:pb-80">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#07090d]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-white">
              {menu.venue.name}
            </h1>
          </div>
          {cartItemCount > 0 && (
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
              <span className="text-lg" aria-hidden>
                🛒
              </span>
              <span className="text-sm font-semibold tabular-nums text-emerald-300">
                {cartItemCount}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-6">
        <ul className="space-y-4">
          {flatItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => addItem(item)}
                aria-label={`${item.name}, ${(item.priceCents / 100).toFixed(2)} ${menu.venue.currency}`}
                className="group flex w-full items-stretch gap-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/40 text-left shadow-lg shadow-black/20 transition hover:border-emerald-500/25 hover:bg-zinc-900/70 hover:shadow-emerald-900/10"
              >
                <div className="relative h-32 w-32 shrink-0 sm:h-36 sm:w-36">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 128px, 144px"
                      className="object-cover transition duration-300 group-hover:scale-105"
                      unoptimized={menuImageUnoptimized(item.imageUrl)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-4xl">
                      🍽️
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                  <p className="font-semibold leading-snug text-white">{item.name}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-lg font-bold tabular-nums text-emerald-400">
                      {(item.priceCents / 100).toFixed(2)}{" "}
                      <span className="text-sm font-medium text-emerald-400/70">
                        {menu.venue.currency}
                      </span>
                    </p>
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xl font-bold text-emerald-950 shadow-lg shadow-emerald-500/25 transition group-hover:bg-emerald-400 group-active:scale-95"
                      aria-hidden
                    >
                      +
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto w-full max-w-lg rounded-t-3xl border border-white/10 border-b-0 bg-zinc-950/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-700/80" />
          <div className="max-h-[min(50vh,22rem)] overflow-y-auto px-4 pb-2 pt-3">
            <label className="mb-3 block">
              <span className="sr-only">Nota ao balcão</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                placeholder="⋯"
                aria-label="Nota ao balcão"
              />
            </label>
            {Object.keys(cart).length > 0 && (
              <ul className="mb-3 space-y-2 border-t border-white/5 pt-3">
                {Object.values(cart).map((line) => (
                  <li
                    key={line.menuItemId}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                      <span className="font-medium">{line.name}</span>
                      <span className="text-zinc-500"> × {line.quantity}</span>
                    </span>
                    <div className="flex items-center gap-1 rounded-lg bg-zinc-800/80 p-0.5">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 hover:bg-zinc-700 hover:text-white"
                        onClick={() => addQty(line, -1)}
                        aria-label="Menos"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 hover:bg-zinc-700 hover:text-white"
                        onClick={() => addQty(line, 1)}
                        aria-label="Mais"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
              <p className="text-xl font-bold tabular-nums text-white">
                {(totals / 100).toFixed(2)}{" "}
                <span className="text-sm font-medium text-zinc-400">
                  {menu.venue.currency}
                </span>
              </p>
              <button
                type="button"
                disabled={submitting || totals === 0}
                onClick={() => void submitOrder()}
                aria-label={submitting ? "A enviar" : "Enviar pedido"}
                className="flex min-h-12 min-w-[3.5rem] items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 text-lg font-bold text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {submitting ? "…" : "✓"}
              </button>
            </div>
            {submitError && (
              <p className="mt-3 text-center text-sm text-red-400">{submitError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
