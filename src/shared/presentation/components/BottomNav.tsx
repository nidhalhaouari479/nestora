"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Heart, House, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/explore", label: "Accueil", icon: House, filled: true, match: ["/explore", "/search", "/logements"] },
  { href: "/mon-logement", label: "Mon logement", icon: Building2, filled: false, match: ["/mon-logement"] },
  { href: "/favoris", label: "Favoris", icon: Heart, filled: true, match: ["/favoris"] },
  { href: "/profil", label: "Profil", icon: UserRound, filled: true, match: ["/profil"] },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {ITEMS.map(({ href, label, icon: Icon, match, filled }) => {
        const isActive = match.some((prefix) => pathname.startsWith(prefix));
        return (
          <Link key={href} href={href} className="bottom-nav-item" aria-current={isActive ? "page" : undefined}>
            <Icon size={21} fill={filled ? "currentColor" : "none"} strokeWidth={filled ? 1.6 : 2.2} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
