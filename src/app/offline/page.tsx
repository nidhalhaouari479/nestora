import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-cream px-8 text-center text-ink">
      <div className="max-w-sm space-y-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal">nestora</p>
        <h1 className="text-3xl font-black">Tu es hors ligne.</h1>
        <p className="text-muted">Certaines pages restent disponibles. Reviens quand ta connexion est retablie.</p>
        <Link className="inline-flex rounded-2xl bg-teal px-6 py-4 font-bold text-white" href="/welcome">
          Retour accueil
        </Link>
      </div>
    </main>
  );
}
