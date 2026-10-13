import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Bus, Camera, Check, Coffee, IdCard, Landmark, MapPin, ShoppingCart } from "lucide-react";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { getListingBySlug } from "@/features/listings/infrastructure/listings-repository";
import { LISTING_TYPE_LABELS, availableFromLong, availableFromShort, formatPrice, isAvailableNow, mapsUrl, occupancyLabel } from "@/features/listings/application/listing-format";
import type { NearbyKind } from "@/features/listings/domain/listing";
import { ListingGallery } from "@/features/listings/presentation/ListingGallery";
import { ListingActionBar } from "@/features/listings/presentation/ListingActionBar";

const NEARBY: Record<NearbyKind, { label: string; icon: typeof Landmark }> = {
  university: { label: "Université", icon: Landmark },
  transport: { label: "Transport", icon: Bus },
  cafe: { label: "Café", icon: Coffee },
  supermarket: { label: "Supermarché", icon: ShoppingCart },
};

export async function generateMetadata({ params }: PageProps<"/logements/[slug]">): Promise<Metadata> {
  const listing = await getListingBySlug((await params).slug);
  return { title: listing ? `${listing.title} · Nestora` : "Logement · Nestora" };
}

export default async function ListingPage({ params }: PageProps<"/logements/[slug]">) {
  const listing = await getListingBySlug((await params).slug);
  if (!listing) notFound();

  const trust = [
    { ok: listing.verifiedOnsite, icon: Check, title: "Visité sur place", text: "Inspection enregistrée" },
    { ok: listing.addressVerified, icon: MapPin, title: "Adresse vérifiée", text: "Localisation contrôlée" },
    { ok: listing.photosVerified, icon: Camera, title: "Photos vérifiées", text: "Images du logement" },
    { ok: listing.landlordVerified, icon: IdCard, title: "Bailleur vérifié", text: "Identité ou autorisation" },
  ].filter((item) => item.ok);

  const amenities = [
    { ok: listing.isFurnished, title: "Meublé", text: "Prêt à habiter" },
    { ok: listing.hasWifi, title: "Wi-Fi", text: "Connexion disponible" },
    { ok: listing.hasAc, title: "Climatiseur", text: "Confort en été" },
    { ok: listing.hasHeating, title: "Chauffage", text: "Pour les soirées fraîches" },
    { ok: listing.inResidence, title: "Résidence", text: "Accès commun contrôlé" },
    { ok: listing.hasDesk, title: "Bureau", text: "Coin de travail" },
  ].filter((item) => item.ok);

  const conditions = [
    ["Dépôt de garantie", listing.depositLabel],
    ["Charges", listing.chargesLabel],
    ["Disponibilité", availableFromLong(listing)],
    ["Capacité", listing.capacity > 1 ? `${listing.capacity} étudiants` : "1 étudiant"],
    ["Visites", listing.visitsLabel],
  ];

  return (
    <AppShell>
      <main className="detail-screen">
        <ListingGallery listingId={listing.id} title={listing.title} photos={listing.photos} verified={listing.verifiedOnsite} />

        <article className="detail-sheet">
          <p className="eyebrow">{LISTING_TYPE_LABELS[listing.type]} · {listing.neighborhood}</p>
          <h1>{listing.headline}</h1>
          <p className="detail-lead">{listing.description}</p>

          <div className="detail-location">
            <span><MapPin size={18} aria-hidden="true" />{listing.neighborhood}, {listing.city}</span>
            <a href={mapsUrl(listing)} target="_blank" rel="noreferrer" className="maps-link">Voir sur Google Maps <ArrowUpRight size={12} aria-hidden="true" /></a>
          </div>

          <section className="price-card" aria-label="Prix">
            <div className="price-card-top">
              <p><strong>{formatPrice(listing.priceTnd)}</strong><span>/ mois</span></p>
              <span className="status-pill">{isAvailableNow(listing) ? "Disponible" : availableFromShort(listing)}</span>
            </div>
            {listing.serviceIncluded && <p className="price-card-service">Service Nestora inclus</p>}
            <ul className="dot-list spaced">
              <li>{listing.walkMinutes} min à pied</li>
              <li>{occupancyLabel(listing)}</li>
              <li>{availableFromShort(listing)}</li>
            </ul>
          </section>

          {trust.length > 0 && (
            <section className="trust-card" aria-labelledby="trust-title">
              <h2 id="trust-title" className="eyebrow">Pourquoi ce logement inspire confiance</h2>
              <ul>
                {trust.map(({ icon: Icon, title, text }) => (
                  <li key={title}>
                    <span className="trust-icon"><Icon size={20} strokeWidth={2.4} aria-hidden="true" /></span>
                    <span><strong>{title}</strong><small>{text}</small></span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {listing.nearby.length > 0 && (
            <section className="detail-section" aria-labelledby="nearby-title">
              <h2 id="nearby-title">Ta vie étudiante à proximité</h2>
              <ul className="nearby-card">
                {listing.nearby.map(({ kind, minutes }) => {
                  const { label, icon: Icon } = NEARBY[kind];
                  return <li key={kind}><Icon size={17} aria-hidden="true" />{label} · {minutes} min</li>;
                })}
              </ul>
            </section>
          )}

          {amenities.length > 0 && (
            <section className="detail-section" aria-labelledby="amenities-title">
              <h2 id="amenities-title">Tout ce qu’il faut au quotidien</h2>
              <ul className="amenity-grid">
                {amenities.map((item) => (
                  <li key={item.title}>
                    <span className="amenity-check"><Check size={13} strokeWidth={3} aria-hidden="true" /></span>
                    <span><strong>{item.title}</strong><small>{item.text}</small></span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {listing.confidenceScore !== null && (
            <section className="detail-section" aria-labelledby="confidence-title">
              <h2 id="confidence-title">Housing Confidence</h2>
              <div className="confidence-card">
                <p className="confidence-score"><strong>{listing.confidenceScore}</strong><span>/ 100</span></p>
                <p>Une évaluation fondée sur la vérification, l’état du logement, l’accès au campus, le rapport qualité-prix et l’adéquation à la vie étudiante.</p>
              </div>
            </section>
          )}

          <section className="detail-section" aria-labelledby="conditions-title">
            <h2 id="conditions-title">Conditions et informations utiles</h2>
            <dl className="conditions-list">
              {conditions.map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <p className="soft-note">Le prix affiché inclut le service Nestora : vérification, accompagnement et suivi jusqu’à l’emménagement.</p>
          </section>
        </article>

        <ListingActionBar slug={listing.slug} />
      </main>
    </AppShell>
  );
}
