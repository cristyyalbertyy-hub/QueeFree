"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";

const VENUE_SLUG = "demo";

type ItemRow = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  isAvailable: boolean;
  sortOrder: number;
};

type CategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  items: ItemRow[];
};

type MenuPayload = {
  venue: { name: string; slug: string; currency: string };
  categories: CategoryRow[];
};

function eurToCents(s: string): number | null {
  const n = parseFloat(s.replace(",", ".").trim());
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function MenuImageUploadButton({
  uploadImage,
  onUploaded,
  disabled,
}: {
  uploadImage: (file: File) => Promise<string | null>;
  onUploaded: (url: string) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled || busy}
        onChange={(e) => {
          void (async () => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            const url = await uploadImage(f);
            setBusy(false);
            if (url) onUploaded(url);
          })();
        }}
      />
      <label
        htmlFor={inputId}
        className={`inline-flex cursor-pointer items-center rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 ${busy || disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        {busy ? "…" : "📷"}
      </label>
    </div>
  );
}

export function StaffMenuEditor() {
  const [data, setData] = useState<MenuPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/staff/menu?venue=${VENUE_SLUG}`, {
      credentials: "include",
    });
    if (res.status === 401) {
      window.location.href = "/staff/login";
      return;
    }
    const json = (await res.json()) as MenuPayload & { error?: string };
    if (!res.ok) {
      setError(json.error ?? "Erro ao carregar");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedCategories = useMemo(() => {
    if (!data) return [];
    return [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data]);

  const primaryCategoryId = sortedCategories[0]?.id ?? "";

  const flatItems = useMemo(() => {
    return sortedCategories.flatMap((cat) =>
      [...cat.items].sort((a, b) => a.sortOrder - b.sortOrder)
    );
  }, [sortedCategories]);

  const uploadMenuImage = useCallback(async (file: File) => {
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/v1/staff/menu/upload", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    let j: { error?: string; url?: string };
    try {
      j = (await res.json()) as { error?: string; url?: string };
    } catch {
      setError("Servidor");
      return null;
    }
    if (res.status === 401) {
      window.location.href = "/staff/login";
      return null;
    }
    if (!res.ok) {
      setError(j.error ?? "Upload falhou");
      return null;
    }
    if (!j.url) {
      setError("Sem URL");
      return null;
    }
    setMessage("OK");
    return j.url;
  }, []);

  async function addItem(draft: {
    name: string;
    description: string;
    imageUrl: string;
    priceEur: string;
  }): Promise<boolean> {
    if (!primaryCategoryId) return false;
    setMessage(null);
    const name = draft.name.trim();
    if (!name) return false;
    const cents = eurToCents(draft.priceEur);
    if (cents === null) {
      setError("Preço inválido");
      return false;
    }
    const res = await fetch("/api/v1/staff/menu/items", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueSlug: VENUE_SLUG,
        categoryId: primaryCategoryId,
        name,
        description: draft.description.trim() || null,
        imageUrl: draft.imageUrl.trim() || null,
        priceCents: cents,
        isAvailable: true,
      }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(j.error ?? "Erro ao criar");
      return false;
    }
    setMessage("OK");
    void load();
    return true;
  }

  async function saveItem(
    item: ItemRow,
    patch: Partial<ItemRow> & { priceEur?: string }
  ) {
    setMessage(null);
    setError(null);
    const body: Record<string, unknown> = { venueSlug: VENUE_SLUG };
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.imageUrl !== undefined) body.imageUrl = patch.imageUrl;
    if (patch.isAvailable !== undefined) body.isAvailable = patch.isAvailable;
    if (patch.sortOrder !== undefined) body.sortOrder = patch.sortOrder;
    if (patch.priceEur !== undefined) {
      const cents = eurToCents(patch.priceEur);
      if (cents === null) {
        setError("Preço inválido");
        return;
      }
      body.priceCents = cents;
    }
    const res = await fetch(`/api/v1/staff/menu/items/${item.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(j.error ?? "Erro ao guardar");
      return;
    }
    setMessage("OK");
    void load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Apagar?")) return;
    setMessage(null);
    const res = await fetch(
      `/api/v1/staff/menu/items/${id}?venueSlug=${encodeURIComponent(VENUE_SLUG)}`,
      { method: "DELETE", credentials: "include" }
    );
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setError(j.error ?? "Erro ao apagar");
      return;
    }
    setMessage("OK");
    void load();
  }

  if (loading && !data) {
    return (
      <p className="text-zinc-500" role="status">
        …
      </p>
    );
  }

  if (!data) {
    return <p className="text-red-400">{error ?? "—"}</p>;
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="sr-only" aria-live="polite">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {!primaryCategoryId ? (
        <p className="text-center text-zinc-500">—</p>
      ) : (
        <>
          <ul className="space-y-6">
            {flatItems.map((item) => (
              <ItemEditor
                key={item.id}
                item={item}
                currency={data.venue.currency}
                uploadMenuImage={uploadMenuImage}
                onSave={saveItem}
                onDelete={deleteItem}
              />
            ))}
          </ul>

          <NewItemForm
            currency={data.venue.currency}
            uploadMenuImage={uploadMenuImage}
            onAdd={addItem}
          />
        </>
      )}

      <p className="text-center">
        <Link
          href="/staff"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 text-xl text-emerald-400 hover:bg-zinc-800"
          aria-label="Pedidos"
        >
          ←
        </Link>
      </p>
    </div>
  );
}

function NewItemForm({
  currency,
  uploadMenuImage,
  onAdd,
}: {
  currency: string;
  uploadMenuImage: (file: File) => Promise<string | null>;
  onAdd: (draft: {
    name: string;
    description: string;
    imageUrl: string;
    priceEur: string;
  }) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    imageUrl: "",
    priceEur: "",
  });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          placeholder="Nome"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        />
        <input
          placeholder={currency}
          value={draft.priceEur}
          onChange={(e) => setDraft((d) => ({ ...d, priceEur: e.target.value }))}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        />
        <input
          placeholder="…"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white sm:col-span-2"
          aria-label="Descrição"
        />
        <input
          placeholder="URL foto"
          value={draft.imageUrl}
          onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value }))}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <MenuImageUploadButton
            uploadImage={uploadMenuImage}
            onUploaded={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
          />
        </div>
      </div>
      <button
        type="button"
        className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        onClick={() => {
          void (async () => {
            const ok = await onAdd(draft);
            if (ok) {
              setDraft({ name: "", description: "", imageUrl: "", priceEur: "" });
            }
          })();
        }}
      >
        +
      </button>
    </div>
  );
}

function ItemEditor({
  item,
  currency,
  uploadMenuImage,
  onSave,
  onDelete,
}: {
  item: ItemRow;
  currency: string;
  uploadMenuImage: (file: File) => Promise<string | null>;
  onSave: (
    item: ItemRow,
    patch: Partial<ItemRow> & { priceEur?: string }
  ) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? "");
  const [priceEur, setPriceEur] = useState((item.priceCents / 100).toFixed(2));
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);

  useEffect(() => {
    setName(item.name);
    setDescription(item.description ?? "");
    setImageUrl(item.imageUrl ?? "");
    setPriceEur((item.priceCents / 100).toFixed(2));
    setSortOrder(String(item.sortOrder));
    setIsAvailable(item.isAvailable);
  }, [item]);

  return (
    <li className="rounded-xl border border-zinc-800 bg-black/20 p-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="sr-only">Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="sr-only">Preço</span>
          <input
            value={priceEur}
            onChange={(e) => setPriceEur(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            aria-label={`Preço em ${currency}`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm lg:col-span-2">
          <span className="sr-only">Descrição</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <div className="lg:col-span-2">
          <span className="sr-only">Foto</span>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            aria-label="URL da foto"
          />
          <div className="mt-2">
            <MenuImageUploadButton
              uploadImage={uploadMenuImage}
              onUploaded={(url) => setImageUrl(url)}
            />
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="sr-only">Ordem</span>
          <input
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            inputMode="numeric"
            aria-label="Ordem de exibição"
          />
        </label>
        <label className="flex items-center gap-2 text-sm lg:col-span-2">
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="h-5 w-5 rounded border-zinc-600"
            aria-label="Disponível no menu"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          onClick={() =>
            void onSave(item, {
              name,
              description: description || null,
              imageUrl: imageUrl || null,
              priceEur,
              sortOrder: parseInt(sortOrder, 10) || 0,
              isAvailable,
            })
          }
        >
          ✓
        </button>
        <button
          type="button"
          className="rounded-lg border border-red-900/50 px-3 py-2 text-sm text-red-300 hover:bg-red-950/50"
          onClick={() => onDelete(item.id)}
        >
          ×
        </button>
      </div>
    </li>
  );
}
