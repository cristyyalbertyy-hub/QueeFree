import { StaffMenuEditor } from "@/components/StaffMenuEditor";

export const metadata = {
  title: "Editar menu — Staff",
};

export default function StaffMenuPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Editar menu</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Categorias, preços, fotos e disponibilidade. Alterações aplicam-se de imediato ao menu
          público.
        </p>
      </div>
      <StaffMenuEditor />
    </main>
  );
}
