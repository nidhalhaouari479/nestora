import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, MapPin } from "lucide-react";
import type { Listing } from "../domain/listing";
import { availabilityLabel, formatPrice, mapsUrl, occupancyLabel } from "../application/listing-format";
import { FavoriteButton } from "./FavoriteButton";

function cover(listing: Listing) {
  return listing.photos[0] ?? { url: "/images/listings/studio-el-manar.jpg", alt: listing.title, position: "center" };
}

function Photo({ listing, className }: { listing: Listing; className: string }) {
  const photo = cover(listing);
  return <div className={className} role="img" aria-label={photo.alt || listing.title}
    style={{ backgroundImage: `url('${photo.url}')`, backgroundPosition: photo.position }} />;
}

// P05A "À deux pas du campus" and P08 results.
export function ListingCardLarge({ listing, showDetails = true }: { listing: Listing; showDetails?: boolean }) {
  return (
    <article className="listing-card">
      <div className="listing-card-media">
        <Photo listing={listing} className="listing-card-photo" />
        {listing.verifiedOnsite && <span className="badge-verified"><Check size={14} strokeWidth={3} aria-hidden="true" />Vérifié sur place</span>}
        <FavoriteButton listingId={listing.id} />
        <span className="badge-dark listing-card-availability">{availabilityLabel(listing)}</span>
      </div>
      <div className="listing-card-body">
        <p className="listing-card-tagline">{listing.tagline}</p>
        <h3><Link href={`/logements/${listing.slug}`} className="stretched-link">{listing.title}</Link></h3>
        {showDetails && (
          <>
            <div className="listing-card-location">
              <span><MapPin size={15} aria-hidden="true" />{listing.neighborhood}, {listing.city}</span>
              <a href={mapsUrl(listing)} target="_blank" rel="noreferrer" className="maps-link">Google Maps <ArrowUpRight size={12} aria-hidden="true" /></a>
            </div>
            <div className="listing-card-price">
              <p><strong>{formatPrice(listing.priceTnd)}</strong><span>/ mois</span></p>
              {listing.confidenceScore !== null && <span className="score-pill">{listing.confidenceScore} / 100</span>}
            </div>
            {listing.serviceIncluded && <p className="listing-card-service">Service Nestora inclus</p>}
            <ul className="dot-list">
              <li>{listing.walkMinutes} min à pied</li>
              <li>{occupancyLabel(listing)}</li>
            </ul>
            <span className="hold-pill">{listing.holdSlotsAvailable} options sur {listing.holdSlotsTotal} disponibles</span>
            <Link href={`/logements/${listing.slug}`} className="primary-button listing-card-cta">Explorer ce logement <ArrowRight size={16} aria-hidden="true" /></Link>
          </>
        )}
      </div>
    </article>
  );
}

// P05B "Disponibles en septembre" carousel.
export function ListingCardCompact({ listing }: { listing: Listing }) {
  return (
    <article className="compact-card">
      <div className="compact-card-media">
        <Photo listing={listing} className="compact-card-photo" />
        {listing.verifiedOnsite && <span className="badge-verified small"><Check size={11} strokeWidth={3} aria-hidden="true" />Vérifié</span>}
        <FavoriteButton listingId={listing.id} className="favorite-button small" size={15} />
      </div>
      <div className="compact-card-body">
        <h3>{listing.shortTitle}</h3>
        <p>{listing.walkMinutes} min du campus</p>
        <p className="compact-card-price"><strong>{formatPrice(listing.priceTnd)}</strong><span>/ mois</span></p>
        <Link href={`/logements/${listing.slug}`} className="pill-button">Explorer ce logement</Link>
      </div>
    </article>
  );
}

// P05B "Foyers privés vérifiés".
export function FoyerCard({ listing }: { listing: Listing }) {
  return (
    <article className="foyer-card">
      <div className="foyer-card-media">
        <Photo listing={listing} className="foyer-card-photo" />
        {listing.verifiedOnsite && <span className="badge-verified small"><Check size={11} strokeWidth={3} aria-hidden="true" />Vérifié</span>}
      </div>
      <div className="foyer-card-body">
        <h3>{listing.shortTitle}</h3>
        <p>{listing.description}</p>
        <strong>{formatPrice(listing.priceTnd)} / mois</strong>
        <Link href={`/logements/${listing.slug}`} className="pill-button large">Explorer ce logement <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
    </article>
  );
}
