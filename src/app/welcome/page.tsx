import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/shared/presentation/components/AppShell";

export default function WelcomePage() {
  return (
    <AppShell>
      <main className="welcome-screen">
        <section className="welcome-hero">
          <p className="welcome-brand">nestora</p>
          <div className="welcome-heading">
            <span className="photo-badge">Vérifié · Près de ton campus</span>
            <h1>Trouve le lieu où ta vie étudiante commence.</h1>
          </div>
        </section>
        <section className="welcome-bottom">
          <p>Des logements vérifiés, des prix clairs et un parcours guidé jusqu’à ton emménagement.</p>
          <div className="welcome-actions">
            <Link className="primary-button" href="/auth"><ArrowRight size={18} />Commencer</Link>
            <Link className="secondary-button" href="/explore">Explorer sans compte</Link>
          </div>
          <Link className="welcome-login" href="/auth/login">Déjà un compte ? <b>Se connecter</b></Link>
          <p className="welcome-language">Français · AR</p>
        </section>
      </main>
    </AppShell>
  );
}
