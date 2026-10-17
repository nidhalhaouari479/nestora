import type { Metadata } from "next";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { BottomNav } from "@/shared/presentation/components/BottomNav";
import { MyHousingView } from "@/features/housing/presentation/MyHousingView";

export const metadata: Metadata = { title: "Mon logement" };

export default function MonLogementPage() {
  return (
    <AppShell>
      <main className="housing-screen">
        <p className="eyebrow">Mon logement</p>
        <h1>Mes visites et dossiers</h1>
        <MyHousingView />
      </main>
      <BottomNav />
    </AppShell>
  );
}
