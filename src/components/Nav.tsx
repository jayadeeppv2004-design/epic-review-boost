"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/employees", label: "Employees" },
  { href: "/dashboard/showrooms", label: "Showrooms" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-lg font-extrabold tracking-tight">
            EPIC <span className="text-toyota-red">Review Boost</span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {LINKS.map((l) => {
              const active =
                l.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    active
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button onClick={logout} className="btn-ghost text-sm">
          Sign out
        </button>
      </div>
      {/* mobile nav */}
      <nav className="flex gap-1 border-t border-neutral-100 px-4 py-2 sm:hidden">
        {LINKS.map((l) => {
          const active =
            l.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                active ? "bg-neutral-900 text-white" : "text-neutral-600"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
