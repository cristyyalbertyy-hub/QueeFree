import Link from "next/link";
import { JoinForm } from "@/components/JoinForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-4 py-12">
      <div>
        <p className="text-sm uppercase tracking-widest text-zinc-500">
          Evento / bar
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Pedidos sem fila
        </h1>
        <p className="mt-3 text-zinc-400">
          Indica o teu número (qualquer país). Recebes no WhatsApp o link do
          menu e o código do pedido — avisamos quando estiver pronto.
        </p>
      </div>

      <JoinForm />

      <p className="text-center text-sm text-zinc-500">
        <Link href="/staff" className="underline hover:text-zinc-300">
          Área bar / cozinha
        </Link>
      </p>
    </main>
  );
}
