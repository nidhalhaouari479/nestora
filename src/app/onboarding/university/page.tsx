import { AppShell } from "@/shared/presentation/components/AppShell";
import { UniversityPicker } from "@/features/onboarding/presentation/UniversityPicker";
import { getUniversities } from "@/features/onboarding/infrastructure/universities-repository";

export default async function UniversityPage() {
  const universities = await getUniversities();
  return (
    <AppShell>
      <main className="min-h-dvh bg-cream text-ink">
        <UniversityPicker universities={universities} />
      </main>
    </AppShell>
  );
}
