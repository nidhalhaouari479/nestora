import Link from "next/link";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { BottomNav } from "@/shared/presentation/components/BottomNav";
import { getSelectedUniversityFromCookie } from "@/features/onboarding/application/selected-university";
import { searchListings } from "@/features/listings/infrastructure/listings-repository";
import { activeFilterChips, parseFilters, serializeFilters } from "@/features/listings/application/listing-filters";
import { SearchBar } from "@/features/listings/presentation/SearchBar";
import { ListingCardLarge } from "@/features/listings/presentation/ListingCards";

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const university = await getSelectedUniversityFromCookie();
  const filters = parseFilters(await searchParams);
  const results = await searchListings(university.id, filters);
  const chips = activeFilterChips(filters);
  const filterQuery = serializeFilters({ ...filters, q: "" });

  return (
    <AppShell>
      <main className="results-screen">
        <header className="results-header">
          <Link href="/explore" className="round-button" aria-label="Retour à l’accueil"><ArrowLeft size={24} strokeWidth={2.4} /></Link>
          <div>
            <h1>{university.shortName}</h1>
            <p>{results.length} logement{results.length > 1 ? "s" : ""}</p>
          </div>
          <Link href={`/explore/filters?${serializeFilters(filters)}`} className="round-button" aria-label="Filtres"><SlidersHorizontal size={22} /></Link>
        </header>

        <SearchBar key={filters.q} defaultValue={filters.q} filterQuery={filterQuery} className="search-card results" />

        {chips.length > 0 && (
          <ul className="active-filters" aria-label="Filtres actifs">
            {chips.map((chip, index) => <li key={chip} className={index === 0 ? "is-primary" : undefined}>{chip}</li>)}
          </ul>
        )}

        <div className="results-list">
          {results.map((listing) => <ListingCardLarge key={listing.id} listing={listing} />)}
          {results.length === 0 && (
            <div className="empty-state">
              <p>Aucun logement ne correspond à ces filtres.</p>
              <Link href="/explore/filters" className="secondary-button">Modifier les filtres</Link>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </AppShell>
  );
}
