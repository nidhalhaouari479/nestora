"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import type { ListingPhoto } from "../domain/listing";
import { FavoriteButton } from "./FavoriteButton";

type Props = {
  listingId: string;
  title: string;
  photos: ListingPhoto[];
  verified: boolean;
};

export function ListingGallery({ listingId, title, photos, verified }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [shareNote, setShareNote] = useState<string | null>(null);

  function handleScroll() {
    const track = trackRef.current;
    if (track) setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareNote("Lien copié");
        window.setTimeout(() => setShareNote(null), 1800);
      }
    } catch {
      // Share sheet dismissed.
    }
  }

  return (
    <div className="gallery">
      <div className="gallery-track" ref={trackRef} onScroll={handleScroll}>
        {photos.map((photo, photoIndex) => (
          <div key={photo.url + photoIndex} className="gallery-photo" role="img" aria-label={photo.alt || title}
            style={{ backgroundImage: `url('${photo.url}')`, backgroundPosition: photo.position }} />
        ))}
      </div>
      <Link href="/search" className="gallery-button gallery-back" aria-label="Retour aux résultats"><ArrowLeft size={24} strokeWidth={2.4} /></Link>
      <div className="gallery-actions">
        <button type="button" className="gallery-button" onClick={share} aria-label="Partager"><ArrowUpRight size={20} strokeWidth={2.4} /></button>
        <FavoriteButton listingId={listingId} className="gallery-button" size={22} />
      </div>
      {shareNote && <span className="gallery-toast" role="status">{shareNote}</span>}
      {verified && <span className="badge-verified gallery-verified"><Check size={14} strokeWidth={3} aria-hidden="true" />Vérifié sur place</span>}
      <span className="badge-dark gallery-count">{Math.min(index + 1, photos.length)} / {photos.length} photos</span>
    </div>
  );
}
