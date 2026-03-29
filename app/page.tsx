import Link from "next/link";
import { JoinForm } from "@/components/JoinForm";

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <Link
        href="/staff/login"
        className="absolute left-4 top-4 text-zinc-600 opacity-70 transition hover:text-zinc-400 hover:opacity-100"
        aria-label="Área staff"
      >
        ⚙
      </Link>
      <div className="flex flex-col items-center gap-2">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-3xl"
          aria-hidden
        >
          ☕
        </div>
      </div>

      <JoinForm />
    </main>
  );
}
