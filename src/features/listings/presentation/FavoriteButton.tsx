"use client";

import { Heart } from "lucide-react";
import { useFavorite } from "../application/favorites";

export function FavoriteButton({ listingId, className = "favorite-button", size = 20 }: { listingId: string; className?: string; size?: number }) {
  const { isFavorite, toggle } = useFavorite(listingId);
  return (
    <button type="button" className={className} aria-pressed={isFavorite}
      aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); void toggle(); }}>
      <Heart size={size} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}
