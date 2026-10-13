"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Search } from "lucide-react";
import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";
import { getSelectedUniversity, normalizeSearch, saveSelectedUniversity } from "../application/universities";
import type { University } from "../domain/university";

export function UniversityPicker({ universities }: { universities: University[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(universities[0]?.id ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = getSelectedUniversity();
      if (saved && universities.some((university) => university.id === saved)) setSelectedId(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [universities]);

  const results = useMemo(() => {
    const term = normalizeSearch(query);
    if (!term) return universities;
    return universities.filter((university) =>
      normalizeSearch([university.name, university.shortName, ...university.areas].join(" ")).includes(term));
  }, [query, universities]);

  async function handleContinue() {
    saveSelectedUniversity(selectedId);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase.from("student_profiles").update({ university_id: selectedId } as never).eq("user_id", data.user.id);
      }
    } catch {
      // The choice is still kept locally; the profile is synced on the next change.
    }
    router.push("/explore");
    router.refresh();
  }

  return (
    <section className="university-content">
      <header className="screen-header">
        <Link className="back-button" href="/verify" aria-label="Retour">
          <ArrowLeft size={25} strokeWidth={2.5} />
        </Link>
        <p className="step-indicator">1 sur 1</p>
      </header>

      <div className="university-intro">
        <p className="eyebrow">Personnalise ton expérience</p>
        <h1>Autour de quelle université veux-tu vivre ?</h1>
        <p>Tu pourras la modifier à tout moment.</p>
      </div>

      <label className="search-field">
        <Search size={20} aria-hidden="true" />
        <span className="sr-only">Rechercher une université</span>
        <input type="search" placeholder="Rechercher une université" value={query}
          onChange={(event) => setQuery(event.target.value)} />
      </label>

      <ul className="university-list" role="radiogroup" aria-label="Universités">
        {results.map((university) => {
          const isSelected = university.id === selectedId;
          return (
            <li key={university.id}>
              <button className="university-card" type="button" role="radio" aria-checked={isSelected}
                onClick={() => setSelectedId(university.id)}>
                <span className="university-thumb" aria-hidden="true"
                  style={{ backgroundImage: `url('${university.image}')`, backgroundPosition: university.imagePosition }} />
                <span className="university-text">
                  <strong>{university.name}</strong>
                  <span>{university.areas.join(" · ")}</span>
                </span>
                {isSelected
                  ? <span className="university-check"><Check size={20} strokeWidth={3} /></span>
                  : <ArrowRight className="university-arrow" size={20} aria-hidden="true" />}
              </button>
            </li>
          );
        })}
        {results.length === 0 && <li className="university-empty">Aucune université trouvée.</li>}
      </ul>

      <div className="university-footer">
        <button className="primary-button" type="button" onClick={handleContinue}>Continuer</button>
      </div>
    </section>
  );
}
