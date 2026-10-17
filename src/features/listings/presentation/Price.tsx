import type { Listing } from "../domain/listing";
import { currentPrice, formatPrice } from "../application/listing-format";

// Monthly price; with a sale price the original one is shown struck through.
export function Price({ listing, suffix = true }: { listing: Listing; suffix?: boolean }) {
  return (
    <>
      <strong>{formatPrice(currentPrice(listing))}{!suffix && " / mois"}</strong>
      {listing.salePriceTnd !== null && <s className="price-old" aria-label={`Au lieu de ${formatPrice(listing.priceTnd)}`}>{formatPrice(listing.priceTnd)}</s>}
      {suffix && <span>/ mois</span>}
    </>
  );
}
