import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { getListingBySlug } from "@/features/listings/infrastructure/listings-repository";
import { formatPrice } from "@/features/listings/application/listing-format";
import { VisitRequestForm } from "@/features/visits/presentation/VisitRequestForm";

export default async function VisitRequestPage({ params }: PageProps<"/logements/[slug]/visite">) {
  const listing = await getListingBySlug((await params).slug);
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
          <h1>Choisis trois dates pour découvrir ce logement.</h1>
          <p>Notre équipe confirmera le créneau final avec toi.</p>
        </div>

        <section className="listing-summary" aria-label="Logement">
          <span className="listing-summary-photo" role="img" aria-label={photo?.alt ?? listing.title}
            style={{ backgroundImage: `url('${photo?.url ?? "/images/listings/studio-thumb.jpg"}')`, backgroundPosition: photo?.position }} />
          <div>
            {listing.verifiedOnsite && <span className="badge-verified small"><Check size={11} strokeWidth={3} aria-hidden="true" />Vérifié</span>}
            <strong>{listing.title}</strong>
            <span>{formatPrice(listing.priceTnd)} / mois · {listing.walkMinutes} min du campus</span>
          </div>
        </section>

        <VisitRequestForm listingId={listing.id} slug={listing.slug} />
      </main>
    </AppShell>
  );
}
