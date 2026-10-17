"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";
import { clockOffset, formatDeadline, getHoldOverview } from "@/features/holds/application/holds";
import { SlotsFullDialog } from "@/features/holds/presentation/SlotsFullDialog";

type Notice = { text: string; link?: { href: string; label: string } };

// Sticky CTA bar of P10A–P10C. "Hold for 24h" opens the rules (P14), the student's option, or P17 when full.
export function ListingActionBar({ listingId, slug }: { listingId: string; slug: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [full, setFull] = useState<{ nextExpiry: string | null; offset: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function hold() {
    if (loading) return;
    setNotice(null);
    if (listingId.startsWith("demo-")) {
      setNotice({ text: "L’option 24 h est disponible sur les logements publiés." });
      return;
    }
    setLoading(true);
    try {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      if (!data.session) {
        setNotice({ text: "Crée ton compte pour poser une option 24 h.", link: { href: "/auth", label: "Créer mon compte" } });
        return;
      }
      const overview = await getHoldOverview(listingId);
      if (!overview) {
        setNotice({ text: "Ce logement n’est plus disponible." });
        return;
      }
      const offset = clockOffset(overview.now);
      if (overview.my_hold_id) {
        router.push(`/options/${overview.my_hold_id}`);
        return;
      }
      if (overview.suspended_until) {
        setNotice({ text: `Tes nouvelles options sont suspendues jusqu’à ${formatDeadline(overview.suspended_until, offset)}. Tu peux toujours demander une visite.` });
        return;
      }
      if (overview.active_count >= overview.slots_total) {
        setFull({ nextExpiry: overview.next_expiry, offset });
        return;
      }
      router.push(`/logements/${slug}/option`);
    } catch {
      setNotice({ text: "Impossible de vérifier les options pour le moment. Réessaie." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="action-bar">
      {notice && (
        <p className="action-bar-notice" role="status">
          {notice.text} {notice.link && <Link href={notice.link.href}>{notice.link.label}</Link>}
        </p>
      )}
      <div className="action-bar-buttons">
        <button type="button" className="primary-button" onClick={hold} disabled={loading}>
          {loading && <Loader2 className="spin-icon" size={16} aria-hidden="true" />}Hold for 24h
        </button>
        <Link href={`/logements/${slug}/visite`} className="secondary-button">Demander une visite</Link>
      </div>
      {full && <SlotsFullDialog nextExpiry={full.nextExpiry} offsetMs={full.offset} onClose={() => setFull(null)} />}
    </div>
  );
}
