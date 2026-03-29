import { Suspense } from "react";
import { MenuView } from "@/components/MenuView";

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-center text-zinc-500" aria-live="polite">
          …
        </p>
      }
    >
      <MenuView />
    </Suspense>
  );
}
