"use client";

import { useCallback, useEffect, useId, useState } from "react";

function InstructionsBody() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-zinc-300">
      <section>
        <h3 className="mb-2 font-semibold text-white">Cliente — entrada</h3>
        <p>
          Escolhe o país e escreve o número de telemóvel (com ou sem +). Carrega em
          continuar: abre-se o menu ligado à tua sessão.
        </p>
      </section>
      <section>
        <h3 className="mb-2 font-semibold text-white">Cliente — menu</h3>
        <p>
          Toca num artigo para adicionar ao pedido. O ícone do cesto mostra quantos
          artigos escolheste. Em baixo podes deixar uma nota para o balcão e vês o
          total. Carrega em enviar para registar o pedido.
        </p>
      </section>
      <section>
        <h3 className="mb-2 font-semibold text-white">Cliente — depois do pedido</h3>
        <p>
          Aparece um código em grande: é esse código que dizes no balcão para
          levantar. O estado do pedido atualiza neste ecrã. Quando o pedido estiver
          pronto, também podes ser avisado por WhatsApp (se estiver configurado no
          servidor).
        </p>
      </section>
      <section>
        <h3 className="mb-2 font-semibold text-white">Bar / cozinha — pedidos</h3>
        <p>
          Vês a lista de pedidos com código, telefone e artigos. Usa o menu de estado
          para marcar o progresso (aceite, a preparar, pronto, levantado, etc.).
          &quot;Atualizar&quot; recarrega a lista.
        </p>
      </section>
      <section>
        <h3 className="mb-2 font-semibold text-white">Bar / cozinha — menu</h3>
        <p>
          Edita nomes, preços, fotos e se o artigo está disponível. Novos artigos
          ficam no menu geral; alterações são imediatas para quem está a ver o menu.
        </p>
      </section>
      <section>
        <h3 className="mb-2 font-semibold text-white">Entrar na área staff</h3>
        <p>
          A palavra-passe é a definida no servidor (<code className="text-emerald-400/90">STAFF_PASSWORD</code> no ambiente de
          produção).
        </p>
      </section>
    </div>
  );
}

export function InstructionsFrame({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onKeyDown]);

  return (
    <>
      {children}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[100] flex h-12 w-12 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900/95 text-lg font-bold text-zinc-200 shadow-lg backdrop-blur-sm transition hover:bg-zinc-800 hover:text-white"
        aria-label="Instruções"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        ?
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center p-3 sm:items-center sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 max-h-[min(85vh,32rem)] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-[#0c0f14] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h2 id={titleId} className="text-lg font-semibold text-white">
                Instruções
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Fechar
              </button>
            </div>
            <div className="max-h-[min(70vh,28rem)] overflow-y-auto px-4 py-4">
              <InstructionsBody />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
