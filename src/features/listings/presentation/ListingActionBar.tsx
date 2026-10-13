"use client";

import { useState } from "react";
import Link from "next/link";

// Sticky CTA bar of P10A–P10C. The 24 h option flow (P14+) ships in the next phase.
export function ListingActionBar({ slug }: { slug: string }) {
  const [notice, setNotice] = useState(false);

  return (
    <div className="action-bar">
      {notice && <p className="action-bar-notice" role="status">L’option 24 h arrive très bientôt. En attendant, demande une visite.</p>}
      <div className="action-bar-buttons">
        <button type="button" className="primary-button" onClick={() => setNotice(true)}>Hold for 24h</button>
        <Link href={`/logements/${slug}/visite`} className="secondary-button">Demander une visite</Link>
      </div>
    </div>
  );
}
