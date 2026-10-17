import Link from "next/link";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { BottomNav } from "@/shared/presentation/components/BottomNav";
import { getSelectedUniversityFromCookie } from "@/features/onboarding/application/selected-university";
import { getHomeListings, type HomeSection } from "@/features/listings/infrastructure/listings-repository";
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

// "Voir tout" link for the built-in highlights; items added in the backoffice have none.
const SEE_ALL: Record<string, string> = {
  near_campus: "/search?near=1",
  september: "/search?month=8",
  foyer: "/search?type=private_foyer",
};

function HighlightSection({ section, universityName }: { section: HomeSection; universityName: string }) {
  const titleId = `highlight-${section.code}-title`;
  const seeAll = SEE_ALL[section.code];
  // The campus section stays visible (with an empty state); the others only when they have listings.
  if (section.code !== "near_campus" && section.listings.length === 0) return null;

  return (
    <section className="home-section" aria-labelledby={titleId}>
      <div className={`section-heading ${section.code === "near_campus" ? "large" : ""}`}>
        <h2 id={titleId}>{section.name}</h2>
        {seeAll && <Link href={seeAll}>Voir tout</Link>}
      </div>
      {section.code === "near_campus" ? (
        section.listings[0]
          ? <ListingCardLarge listing={section.listings[0]} />
          : <p className="empty-state">Aucun logement publié autour de {universityName} pour le moment.</p>
      ) : section.code === "foyer" ? (
        section.listings.map((listing) => <FoyerCard key={listing.id} listing={listing} />)
      ) : (
        <div className="carousel">
          {section.listings.map((listing) => <ListingCardCompact key={listing.id} listing={listing} />)}
        </div>
      )}
    </section>
  );
}

export default async function HomePage() {
  const university = await getSelectedUniversityFromCookie();
  const home = await getHomeListings(university.id);
  // "Selon ton style de vie" sits after the first two highlight sections.
  const before = home.sections.slice(0, 2);
  const after = home.sections.slice(2);

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

        {before.map((section) => <HighlightSection key={section.code} section={section} universityName={university.shortName} />)}

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

        {after.map((section) => <HighlightSection key={section.code} section={section} universityName={university.shortName} />)}
      </main>
      <BottomNav />
    </AppShell>
  );
}
