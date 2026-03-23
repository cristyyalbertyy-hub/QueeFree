"use client";

import { useCallback, useEffect, useId, useState } from "react";
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
        {busy ? "A enviar…" : "Carregar imagem"}
      </label>
      <span className="text-xs text-zinc-600">JPG, PNG, WebP ou GIF · máx. 5 MB</span>
    </div>
  );
}

export function StaffMenuEditor() {
  const [data, setData] = useState<MenuPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState("");

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
      setError("Resposta inválida do servidor.");
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
      setError("Resposta sem URL.");
      return null;
    }
    setMessage("Imagem carregada. Confirma a URL abaixo e guarda o item.");
    return j.url;
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const name = newCatName.trim();
    if (!name) return;
    const res = await fetch("/api/v1/staff/menu/categories", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueSlug: VENUE_SLUG, name }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(j.error ?? "Erro");
      return;
    }
    setNewCatName("");
    setMessage("Categoria criada.");
    void load();
  }

  async function saveCategory(cat: CategoryRow, name: string, sortOrder: number) {
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/v1/staff/menu/categories/${cat.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueSlug: VENUE_SLUG,
        name: name.trim(),
        sortOrder,
      }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(j.error ?? "Erro ao guardar categoria");
      return;
    }
    setMessage("Categoria atualizada.");
    void load();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Apagar esta categoria e todos os itens dentro?")) return;
    setMessage(null);
    const res = await fetch(
      `/api/v1/staff/menu/categories/${id}?venueSlug=${encodeURIComponent(VENUE_SLUG)}`,
      { method: "DELETE", credentials: "include" }
    );
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setError(j.error ?? "Erro ao apagar");
      return;
    }
    setMessage("Categoria apagada.");
    void load();
  }

  async function addItem(
    categoryId: string,
    draft: {
      name: string;
      description: string;
      imageUrl: string;
      priceEur: string;
    }
  ): Promise<boolean> {
    setMessage(null);
    const name = draft.name.trim();
    if (!name) return false;
    const cents = eurToCents(draft.priceEur);
    if (cents === null) {
      setError("Preço inválido.");
      return false;
    }
    const res = await fetch("/api/v1/staff/menu/items", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueSlug: VENUE_SLUG,
        categoryId,
        name,
        description: draft.description.trim() || null,
        imageUrl: draft.imageUrl.trim() || null,
        priceCents: cents,
        isAvailable: true,
      }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(j.error ?? "Erro ao criar item");
      return false;
    }
    setMessage("Item adicionado.");
    void load();
    return true;
  }

  async function saveItem(
    item: ItemRow,
    patch: Partial<ItemRow> & { priceEur?: string; categoryId?: string }
  ) {
    setMessage(null);
    setError(null);
    const body: Record<string, unknown> = { venueSlug: VENUE_SLUG };
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.imageUrl !== undefined) body.imageUrl = patch.imageUrl;
    if (patch.isAvailable !== undefined) body.isAvailable = patch.isAvailable;
    if (patch.sortOrder !== undefined) body.sortOrder = patch.sortOrder;
    if (patch.categoryId !== undefined) body.categoryId = patch.categoryId;
    if (patch.priceEur !== undefined) {
      const cents = eurToCents(patch.priceEur);
      if (cents === null) {
        setError("Preço inválido.");
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
    setMessage("Item guardado.");
    void load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Apagar este item?")) return;
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
    setMessage("Item apagado.");
    void load();
  }

  if (loading && !data) {
    return (
      <p className="text-zinc-500" role="status">
        A carregar menu…
      </p>
    );
  }

  if (!data) {
    return <p className="text-red-400">{error ?? "Sem dados."}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-sm text-zinc-400">
          Local: <strong className="text-white">{data.venue.name}</strong> · Moeda:{" "}
          {data.venue.currency}
        </p>
      </div>

      {message && (
        <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <form
        onSubmit={addCategory}
        className="flex flex-col gap-2 rounded-xl border border-dashed border-zinc-700 p-4 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-zinc-500">Nova categoria</span>
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Ex.: Cocktails"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Adicionar categoria
        </button>
      </form>

      {data.categories.map((cat) => (
        <CategoryBlock
          key={cat.id}
          cat={cat}
          currency={data.venue.currency}
          allCategories={data.categories}
          uploadMenuImage={uploadMenuImage}
          onSaveCategory={saveCategory}
          onDeleteCategory={deleteCategory}
          onAddItem={addItem}
          onSaveItem={saveItem}
          onDeleteItem={deleteItem}
        />
      ))}

      {data.categories.length === 0 && (
        <p className="text-center text-zinc-500">
          Ainda não há categorias. Cria uma acima.
        </p>
      )}

      <p className="text-center text-sm text-zinc-600">
        <Link href="/staff" className="text-emerald-400 underline hover:text-emerald-300">
          ← Voltar aos pedidos
        </Link>
      </p>
    </div>
  );
}

function CategoryBlock({
  cat,
  currency,
  allCategories,
  uploadMenuImage,
  onSaveCategory,
  onDeleteCategory,
  onAddItem,
  onSaveItem,
  onDeleteItem,
}: {
  cat: CategoryRow;
  currency: string;
  allCategories: CategoryRow[];
  uploadMenuImage: (file: File) => Promise<string | null>;
  onSaveCategory: (c: CategoryRow, name: string, sortOrder: number) => void;
  onDeleteCategory: (id: string) => void;
  onAddItem: (
    categoryId: string,
    draft: { name: string; description: string; imageUrl: string; priceEur: string }
  ) => Promise<boolean>;
  onSaveItem: (
    item: ItemRow,
    patch: Partial<ItemRow> & { priceEur?: string; categoryId?: string }
  ) => Promise<void>;
  onDeleteItem: (id: string) => void;
}) {
  const [name, setName] = useState(cat.name);
  const [sortOrder, setSortOrder] = useState(String(cat.sortOrder));
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    imageUrl: "",
    priceEur: "",
  });

  useEffect(() => {
    setName(cat.name);
    setSortOrder(String(cat.sortOrder));
  }, [cat.id, cat.name, cat.sortOrder]);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/50">
      <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-zinc-500">Nome da categoria</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>
        <label className="w-full sm:w-24">
          <span className="text-xs text-zinc-500">Ordem</span>
          <input
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
            inputMode="numeric"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
            onClick={() =>
              onSaveCategory(cat, name, parseInt(sortOrder, 10) || 0)
            }
          >
            Guardar categoria
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-900/50 px-3 py-2 text-sm text-red-300 hover:bg-red-950/50"
            onClick={() => onDeleteCategory(cat.id)}
          >
            Apagar
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Itens
        </h3>
        <ul className="space-y-6">
          {cat.items.map((item) => (
            <ItemEditor
              key={item.id}
              item={item}
              currency={currency}
              categories={allCategories}
              currentCategoryId={cat.id}
              uploadMenuImage={uploadMenuImage}
              onSave={onSaveItem}
              onDelete={onDeleteItem}
            />
          ))}
        </ul>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Novo item nesta categoria
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              placeholder="Nome"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            />
            <input
              placeholder={`Preço (${currency}) ex: 2.50`}
              value={draft.priceEur}
              onChange={(e) => setDraft((d) => ({ ...d, priceEur: e.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="Descrição (opcional)"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white sm:col-span-2"
            />
            <input
              placeholder="URL da foto (opcional) — ou carrega abaixo"
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
                const ok = await onAddItem(cat.id, draft);
                if (ok) {
                  setDraft({ name: "", description: "", imageUrl: "", priceEur: "" });
                }
              })();
            }}
          >
            Adicionar item
          </button>
        </div>
      </div>
    </section>
  );
}

function ItemEditor({
  item,
  currency,
  categories,
  currentCategoryId,
  uploadMenuImage,
  onSave,
  onDelete,
}: {
  item: ItemRow;
  currency: string;
  categories: CategoryRow[];
  currentCategoryId: string;
  uploadMenuImage: (file: File) => Promise<string | null>;
  onSave: (
    item: ItemRow,
    patch: Partial<ItemRow> & { priceEur?: string; categoryId?: string }
  ) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? "");
  const [priceEur, setPriceEur] = useState((item.priceCents / 100).toFixed(2));
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));
  const [categoryId, setCategoryId] = useState(currentCategoryId);
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);

  useEffect(() => {
    setName(item.name);
    setDescription(item.description ?? "");
    setImageUrl(item.imageUrl ?? "");
    setPriceEur((item.priceCents / 100).toFixed(2));
    setSortOrder(String(item.sortOrder));
    setCategoryId(currentCategoryId);
    setIsAvailable(item.isAvailable);
  }, [item, currentCategoryId]);

  return (
    <li className="rounded-xl border border-zinc-800 bg-black/20 p-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Preço ({currency})</span>
          <input
            value={priceEur}
            onChange={(e) => setPriceEur(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm lg:col-span-2">
          <span className="text-zinc-500">Descrição</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <div className="lg:col-span-2">
          <span className="text-sm text-zinc-500">Foto</span>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/menu/ficheiro.jpg ou URL externa"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
          <div className="mt-2">
            <MenuImageUploadButton
              uploadImage={uploadMenuImage}
              onUploaded={(url) => setImageUrl(url)}
            />
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Categoria</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Ordem</span>
          <input
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            inputMode="numeric"
          />
        </label>
        <label className="flex items-center gap-2 text-sm lg:col-span-2">
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="rounded border-zinc-600"
          />
          <span className="text-zinc-300">Disponível no menu</span>
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
              categoryId: categoryId !== currentCategoryId ? categoryId : undefined,
              isAvailable,
            })
          }
        >
          Guardar item
        </button>
        <button
          type="button"
          className="rounded-lg border border-red-900/50 px-3 py-2 text-sm text-red-300 hover:bg-red-950/50"
          onClick={() => onDelete(item.id)}
        >
          Apagar item
        </button>
      </div>
    </li>
  );
}
