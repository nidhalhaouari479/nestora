import Link from "next/link";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { BrandMark } from "@/shared/presentation/components/BrandMark";

export default function SplashPage() {
  return (
    <AppShell>
      <main className="splash-screen">
        <div className="splash-brand">
          <BrandMark size="lg" />
          <h1>nestora</h1>
          <p>Ton prochain chapitre<br />commence ici.</p>
        </div>
        <div className="splash-photo" role="img" aria-label="Vue sur les maisons blanches et la mer à Tunis" />
        <Link aria-label="Continuer vers la page bienvenue" href="/welcome" className="splash-link" />
      </main>
    </AppShell>
  );
}
