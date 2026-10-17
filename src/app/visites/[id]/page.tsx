import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { BottomNav } from "@/shared/presentation/components/BottomNav";
import { VisitConfirmed } from "@/features/housing/presentation/VisitConfirmed";

export const metadata: Metadata = { title: "Visite confirmée · Nestora" };

// P24 — confirmed visit.
export default async function VisitPage({ params }: PageProps<"/visites/[id]">) {
  const { id } = await params;
  return (
    <AppShell>
      <main className="hold-screen">
        <header className="screen-header">
          <Link className="back-button" href="/mon-logement" aria-label="Retour à Mon logement"><ArrowLeft size={24} strokeWidth={2.4} /></Link>
          <p className="hold-header-title">Visite confirmée</p>
        </header>
        <VisitConfirmed id={id} />
      </main>
      <BottomNav />
    </AppShell>
  );
}
