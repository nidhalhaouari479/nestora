import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { ConfirmChoice } from "@/features/holds/presentation/ConfirmChoice";

export const metadata: Metadata = { title: "Confirmer le logement · Nestora" };

// P21 → P22A — choose Instant Booking or a visit.
export default async function ConfirmHoldPage({ params }: PageProps<"/options/[id]/confirmer">) {
  const { id } = await params;
  return (
    <AppShell>
      <main className="hold-screen">
        <header className="screen-header">
          <Link className="back-button" href={`/options/${id}`} aria-label="Retour à mon option"><ArrowLeft size={24} strokeWidth={2.4} /></Link>
          <p className="hold-header-title">Confirmer le logement</p>
        </header>
        <ConfirmChoice id={id} />
      </main>
    </AppShell>
  );
}
