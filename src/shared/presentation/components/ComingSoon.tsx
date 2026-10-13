import Link from "next/link";
import { AppShell } from "./AppShell";
import { BottomNav } from "./BottomNav";

// Tabs planned for the next phases (Mon logement, Favoris, Profil).
export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <AppShell>
      <main className="coming-soon">
        <p className="eyebrow">Bientôt disponible</p>
        <h1>{title}</h1>
        <p>{text}</p>
        <Link className="primary-button" href="/explore">Continuer à explorer</Link>
      </main>
      <BottomNav />
    </AppShell>
  );
}
