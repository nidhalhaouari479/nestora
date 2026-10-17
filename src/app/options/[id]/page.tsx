import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { BottomNav } from "@/shared/presentation/components/BottomNav";
import { HoldView } from "@/features/holds/presentation/HoldView";

export const metadata: Metadata = { title: "Mon option · Nestora" };

// P15A → P20 — the student's 24 h option (state read from the database).
export default async function HoldPage({ params }: PageProps<"/options/[id]">) {
  const { id } = await params;
  return (
    <AppShell>
      <main className="hold-screen">
        <header className="screen-header">
          <Link className="back-button" href="/mon-logement" aria-label="Retour à Mon logement"><ArrowLeft size={24} strokeWidth={2.4} /></Link>
          <p className="hold-header-title">Mon option</p>
        </header>
        <HoldView id={id} />
      </main>
      <BottomNav />
    </AppShell>
  );
}
