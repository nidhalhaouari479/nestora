import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { getListingBySlug } from "@/features/listings/infrastructure/listings-repository";
import { formatSlot, formatVisitDate } from "@/features/visits/application/visit-dates";

const STEPS = [
  { title: "Demande reçue", text: "Tes disponibilités sont enregistrées", state: "done" },
  { title: "Choix de la date", text: "Notre équipe retient une de tes dates", state: "current" },
  { title: "Visite confirmée", text: "Adresse et détails dans Mon logement", state: "todo" },
] as const;

export default async function VisitSentPage({ params, searchParams }: PageProps<"/logements/[slug]/visite/envoyee">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const date = typeof query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : null;
  const slot = typeof query.slot === "string" ? query.slot : null;
  const count = typeof query.count === "string" ? Math.min(Math.max(Number.parseInt(query.count, 10) || 1, 1), 7) : 1;
  const photo = listing.photos[0];

  return (
    <AppShell>
      <main className="sent-screen">
        <div className="sent-check" aria-hidden="true"><Check size={46} strokeWidth={3} /></div>
        <p className="eyebrow">Demande envoyée</p>
        <h1>Ta visite est en route.</h1>
        <p className="sent-lead">Nous choisissons la date finale parmi tes disponibilités. Tu recevras la confirmation dans Mon logement.</p>

        <section className="sent-listing" aria-label="Récapitulatif">
          <span className="listing-summary-photo" role="img" aria-label={photo?.alt ?? listing.title}
            style={{ backgroundImage: `url('${photo?.url ?? "/images/listings/studio-thumb.jpg"}')`, backgroundPosition: photo?.position }} />
          <div>
            <strong>{listing.title}</strong>
            {count > 1
              ? <span>{count} disponibilités envoyées{date ? `, à partir du ${formatVisitDate(date)}` : ""}</span>
              : date && <span>{formatVisitDate(date)}</span>}
            {count === 1 && slot && <span>Créneau : {formatSlot(slot)}</span>}
          </div>
        </section>

        <section className="next-steps" aria-labelledby="next-title">
          <h2 id="next-title" className="eyebrow">La suite</h2>
          <ol>
            {STEPS.map((step, index) => (
              <li key={step.title} className={`step-${step.state}`} aria-current={step.state === "current" ? "step" : undefined}>
                <span className="step-marker">{step.state === "done" ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : index + 1}</span>
                <span><strong>{step.title}</strong><small>{step.text}</small></span>
              </li>
            ))}
          </ol>
        </section>

        <div className="sent-actions">
          <Link href="/mon-logement" className="primary-button">Suivre dans Mon logement</Link>
          <Link href="/explore" className="secondary-button">Continuer à explorer</Link>
        </div>
      </main>
    </AppShell>
  );
}
