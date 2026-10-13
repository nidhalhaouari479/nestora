import { AppShell } from "@/shared/presentation/components/AppShell";
import { getSelectedUniversityFromCookie } from "@/features/onboarding/application/selected-university";
import { getListingCatalog } from "@/features/listings/infrastructure/listings-repository";
import { parseFilters } from "@/features/listings/application/listing-filters";
import { FiltersSheet } from "@/features/listings/presentation/FiltersSheet";

export default async function FiltersPage({ searchParams }: PageProps<"/explore/filters">) {
  const university = await getSelectedUniversityFromCookie();
  const [catalog, params] = await Promise.all([getListingCatalog(university.id), searchParams]);

  return (
    <AppShell>
      <main>
        <FiltersSheet catalog={catalog} initial={parseFilters(params)} />
      </main>
    </AppShell>
  );
}
