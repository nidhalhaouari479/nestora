import Link from "next/link";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { BottomNav } from "@/shared/presentation/components/BottomNav";
import { getSelectedUniversityFromCookie } from "@/features/onboarding/application/selected-university";
import { getHomeListings } from "@/features/listings/infrastructure/listings-repository";
import { HomeGreeting } from "@/features/listings/presentation/HomeGreeting";
import { SearchBar } from "@/features/listings/presentation/SearchBar";
import { StickyDiscoverHeader } from "@/features/listings/presentation/StickyDiscoverHeader";
import { FoyerCard, ListingCardCompact, ListingCardLarge } from "@/features/listings/presentation/ListingCards";

const LIFESTYLES = [
  { label: "Calme pour étudier", image: "/images/listings/calme.jpg", href: "/search?comfort=furnished" },
  { label: "Proche du transport", image: "/images/listings/transport.jpg", href: "/search?near=1" },
  { label: "Vie en résidence", image: "/images/listings/residence.jpg", href: "/search?comfort=residence" },
];

const QUICK_FILTERS = [
  { label: "À moins de 15 min", href: "/search?near=1", tone: "teal" },
  { label: "Disponible maintenant", href: "/search?now=1", tone: "sand" },
  { label: "Studio", href: "/search?type=s0", tone: "light" },
];

export default async function HomePage() {
  const university = await getSelectedUniversityFromCookie();
  const home = await getHomeListings(university.id);
  const featured = home.nearCampus[0];

  return (
    <AppShell>
      <main className="home-screen">
        <StickyDiscoverHeader sentinelId="home-search-sentinel" />
        <HomeGreeting universityName={university.shortName} />

        <section className="home-hero" aria-labelledby="home-hero-title">
          <div className="home-hero-photo">
            <span className="badge-dark">{home.total} logements vérifiés</span>
            <h1 id="home-hero-title">Ton prochain chapitre, près de {university.shortName}.</h1>
          </div>
          <SearchBar />
          <span id="home-search-sentinel" aria-hidden="true" />
        </section>

        <nav className="quick-filters" aria-label="Filtres rapides">
          {QUICK_FILTERS.map((filter) => (
            <Link key={filter.label} href={filter.href} className={`chip chip-${filter.tone}`}>{filter.label}</Link>
          ))}
        </nav>

        <section className="home-section" aria-labelledby="near-title">
          <div className="section-heading large">
            <h2 id="near-title">À deux pas du campus</h2>
            <Link href="/search?near=1">Voir tout</Link>
          </div>
          {featured
            ? <ListingCardLarge listing={featured} />
            : <p className="empty-state">Aucun logement publié autour de {university.shortName} pour le moment.</p>}
        </section>

        {home.september.length > 0 && (
          <section className="home-section" aria-labelledby="september-title">
            <div className="section-heading">
              <h2 id="september-title">Disponibles en septembre</h2>
              <Link href="/search?month=8">Voir tout</Link>
            </div>
            <div className="carousel">
              {home.september.map((listing) => <ListingCardCompact key={listing.id} listing={listing} />)}
            </div>
          </section>
        )}

        <section className="home-section" aria-labelledby="lifestyle-title">
          <div className="section-heading">
            <h2 id="lifestyle-title">Selon ton style de vie</h2>
          </div>
          <div className="lifestyle-grid">
            {LIFESTYLES.map((item) => (
              <Link key={item.label} href={item.href} className="lifestyle-tile" style={{ backgroundImage: `url('${item.image}')` }}>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {home.foyers.length > 0 && (
          <section className="home-section" aria-labelledby="foyer-title">
            <div className="section-heading">
              <h2 id="foyer-title">Foyers privés vérifiés</h2>
              <Link href="/search?type=private_foyer">Voir tout</Link>
            </div>
            {home.foyers.map((listing) => <FoyerCard key={listing.id} listing={listing} />)}
          </section>
        )}
      </main>
      <BottomNav />
    </AppShell>
  );
}
