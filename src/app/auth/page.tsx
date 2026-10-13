import { AppShell } from "@/shared/presentation/components/AppShell";
import { SignupForm } from "@/features/auth/presentation/SignupForm";

export default function AuthPage() {
  return (
    <AppShell>
      <main className="min-h-dvh bg-cream text-ink">
        <SignupForm />
      </main>
    </AppShell>
  );
}
