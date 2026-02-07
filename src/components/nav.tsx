"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";

const publicLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/standings", label: "Standings" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useAuth();

  if (pathname === "/login") return null;

  const links = isAdmin
    ? [...publicLinks, { href: "/setup", label: "Setup" }]
    : publicLinks;

  async function signOut() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-[17px] italic text-neutral-900"
        >
          <Image src="/logo.png" alt="RBGC" width={24} height={28} />
          Golf League
        </Link>
        <div className="flex items-center gap-6">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[13px] font-medium transition-colors ${
                  isActive
                    ? "text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {isAdmin ? (
            <button
              onClick={signOut}
              className="text-[13px] text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="text-[13px] text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
