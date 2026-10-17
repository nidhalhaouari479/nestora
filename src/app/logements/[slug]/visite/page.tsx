import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { getListingBySlug } from "@/features/listings/infrastructure/listings-repository";
import { currentPrice, formatPrice } from "@/features/listings/application/listing-format";
import { VisitRequestForm } from "@/features/visits/presentation/VisitRequestForm";
import { getVisitClock } from "@/features/visits/infrastructure/visit-clock";

export default async function VisitRequestPage({ params }: PageProps<"/logements/[slug]/visite">) {
  const [listing, clock] = await Promise.all([getListingBySlug((await params).slug), getVisitClock()]);
  if (!listing) notFound();
  const photo = listing.photos[0];

  return (
    <AppShell>
      <main className="visit-screen">
        <header className="screen-header">
          <Link className="back-button" href={`/logements/${listing.slug}`} aria-label="Retour au logement"><ArrowLeft size={24} strokeWidth={2.4} /></Link>
          <p className="visit-header-title">Demander une visite</p>
        </header>

        <div className="visit-intro">
          <h1>Quand es-tu disponible cette semaine ?</h1>
          <p>Choisis un ou plusieurs jours parmi les 7 prochains, avec un créneau pour chacun. Notre équipe retiendra la date finale.</p>
        </div>

        <section className="listing-summary" aria-label="Logement">
          <span className="listing-summary-photo" role="img" aria-label={photo?.alt ?? listing.title}
            style={{ backgroundImage: `url('${photo?.url ?? "/images/listings/studio-thumb.jpg"}')`, backgroundPosition: photo?.position }} />
          <div>
            {listing.verifiedOnsite && <span className="badge-verified small"><Check size={11} strokeWidth={3} aria-hidden="true" />Vérifié</span>}
            <strong>{listing.title}</strong>
            <span>{formatPrice(currentPrice(listing))} / mois · {listing.walkMinutes} min du campus</span>
          </div>
        </section>

        <VisitRequestForm listingId={listing.id} slug={listing.slug} clock={clock} />
      </main>
    </AppShell>
  );
}
