import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, Clock3, UserRound } from "lucide-react";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { getListingBySlug } from "@/features/listings/infrastructure/listings-repository";
import { currentPrice } from "@/features/listings/application/listing-format";
import { HoldListingCard } from "@/features/holds/presentation/HoldListingCard";
import { HoldActivate } from "@/features/holds/presentation/HoldActivate";

export const metadata: Metadata = { title: "Option 24 h · Nestora" };

const RULES = [
  { icon: Clock3, title: "24 heures", text: "Le compteur démarre dès la confirmation." },
  { icon: UserRound, title: "3 étudiants maximum", text: "Jusqu’à trois étudiants peuvent poser une option." },
  { icon: CircleCheck, title: "Priorité au premier", text: "Le premier à confirmer le logement reçoit la priorité." },
];

// P14 — rules of the 24 h option before activating it.
export default async function HoldRulesPage({ params }: PageProps<"/logements/[slug]/option">) {
  const listing = await getListingBySlug((await params).slug);
  if (!listing) notFound();

  return (
    <AppShell>
      <main className="hold-screen">
        <header className="screen-header">
          <Link className="back-button" href={`/logements/${listing.slug}`} aria-label="Retour au logement"><ArrowLeft size={24} strokeWidth={2.4} /></Link>
          <p className="hold-header-title">Option 24 h</p>
        </header>

        <HoldListingCard title={listing.title} neighborhood={listing.neighborhood} city={listing.city} priceTnd={currentPrice(listing)}
          walkMinutes={listing.walkMinutes} verified={listing.verifiedOnsite} photo={listing.photos[0] ?? null} />

        <div className="hold-intro">
          <h1>Prends 24 heures pour décider, sans pression.</h1>
          <p>Ton option garde ce logement dans ton parcours pendant une journée, mais elle reste non exclusive.</p>
        </div>

        <ul className="hold-rules">
          {RULES.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="hold-rule-icon"><Icon size={20} aria-hidden="true" /></span>
              <p><strong>{title}</strong><span>{text}</span></p>
            </li>
          ))}
        </ul>

        <div className="hold-warning tone-amber">
          <Clock3 size={20} aria-hidden="true" />
          <p><strong>Règle des 3 dernières heures</strong>Confirme ou libère ton option au plus tard 3 h avant son expiration. Sinon, les nouvelles options seront suspendues pendant 48 h.</p>
        </div>

        <HoldActivate listingId={listing.id} />
      </main>
    </AppShell>
  );
}
