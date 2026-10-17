import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Camera, Check, IdCard, MapPin } from "lucide-react";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { getListingBySlug } from "@/features/listings/infrastructure/listings-repository";
import { GENDER_LABELS, LISTING_TYPE_LABELS, availableFromLong, availableFromShort, featuresOf, isAvailableNow, mapsUrl, occupancyLabel } from "@/features/listings/application/listing-format";
import { FeatureIcon } from "@/features/listings/presentation/FeatureIcon";
import { Price } from "@/features/listings/presentation/Price";
import { ListingGallery } from "@/features/listings/presentation/ListingGallery";
import { ListingActionBar } from "@/features/listings/presentation/ListingActionBar";

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

  const nearby = featuresOf(listing, "nearby");
  const amenities = featuresOf(listing, "equipment");

  const conditions = [
    ...featuresOf(listing, "condition").map((feature) => [feature.name, feature.value]),
    ["Pour qui", GENDER_LABELS[listing.gender]],
    ["Disponibilité", availableFromLong(listing)],
    ["Capacité", listing.capacity > 1 ? `${listing.capacity} étudiants` : "1 étudiant"],
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
              <p><Price listing={listing} /></p>
              <span className="status-pill">{isAvailableNow(listing) ? "Disponible" : availableFromShort(listing)}</span>
            </div>
            {listing.serviceIncluded && <p className="price-card-service">Service Nestora inclus</p>}
            <ul className="dot-list spaced">
              <li>{listing.walkMinutes} min à pied</li>
              <li>{occupancyLabel(listing)}</li>
              <li>{GENDER_LABELS[listing.gender]}</li>
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

          {nearby.length > 0 && (
            <section className="detail-section" aria-labelledby="nearby-title">
              <h2 id="nearby-title">Ta vie étudiante à proximité</h2>
              <ul className="nearby-card">
                {nearby.map((feature) => (
                  <li key={feature.code}><FeatureIcon name={feature.icon} size={17} />{feature.name} · {feature.value} min</li>
                ))}
              </ul>
            </section>
          )}

          {amenities.length > 0 && (
            <section className="detail-section" aria-labelledby="amenities-title">
              <h2 id="amenities-title">Tout ce qu’il faut au quotidien</h2>
              <ul className="amenity-grid">
                {amenities.map((feature) => (
                  <li key={feature.code}>
                    <span className="amenity-check"><FeatureIcon name={feature.icon} size={13} /></span>
                    <span><strong>{feature.name}</strong>{feature.value && <small>{feature.value}</small>}</span>
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

        <ListingActionBar listingId={listing.id} slug={listing.slug} />
      </main>
    </AppShell>
  );
}
