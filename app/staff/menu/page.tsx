import { StaffMenuEditor } from "@/components/StaffMenuEditor";

export const metadata = {
  title: "Menu — Staff",
};

export default function StaffMenuPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <StaffMenuEditor />
    </main>
  );
}
