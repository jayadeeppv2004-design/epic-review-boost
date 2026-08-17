import Nav from "@/components/Nav";
import { isAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) redirect("/login");
  return (
    <div className="min-h-screen bg-neutral-50">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
