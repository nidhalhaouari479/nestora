import { Check } from "lucide-react";

type Props = {
  title: string;
  neighborhood: string;
  city: string;
  priceTnd: number;
  walkMinutes: number;
  verified: boolean;
  photo: { url: string; position?: string } | null;
};

// Listing summary at the top of P14 → P21 (photo, Vérifié, title, area, price · walk).
export function HoldListingCard({ title, neighborhood, city, priceTnd, walkMinutes, verified, photo }: Props) {
  return (
    <section className="hold-listing" aria-label="Logement">
      <span className="hold-listing-photo" role="img" aria-label={title}
        style={{ backgroundImage: `url('${photo?.url ?? "/images/listings/studio-thumb.jpg"}')`, backgroundPosition: photo?.position }} />
      <div>
        {verified && <span className="badge-verified small"><Check size={11} strokeWidth={3} aria-hidden="true" />Vérifié</span>}
        <strong>{title}</strong>
        <span>{[neighborhood, city].filter(Boolean).join(", ")}</span>
        <b>{new Intl.NumberFormat("fr-FR").format(priceTnd)} TND / mois · {walkMinutes} min du campus</b>
      </div>
    </section>
  );
}
