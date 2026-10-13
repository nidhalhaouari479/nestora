"use client";

import { useEffect, useState } from "react";
import { SearchBar } from "./SearchBar";

// P05B: once the hero search scrolls away, a compact header with the search bar takes over.
export function StickyDiscoverHeader({ sentinelId }: { sentinelId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelId]);

  return (
    <div className={`discover-header ${visible ? "is-visible" : ""}`} aria-hidden={!visible} inert={!visible}>
      <h2>Découvre ton prochain chez-toi</h2>
      <p>Des logements pensés autour de ta vie étudiante.</p>
      <SearchBar className="search-card compact" />
    </div>
  );
}
