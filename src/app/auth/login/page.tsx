import { AppShell } from "@/shared/presentation/components/AppShell";
import { LoginForm } from "@/features/auth/presentation/LoginForm";

export default function LoginPage() {
  return (
    <AppShell>
      <main className="min-h-dvh bg-cream text-ink">
        <LoginForm />
      </main>
    </AppShell>
  );
}
