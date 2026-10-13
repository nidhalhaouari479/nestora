import { AppShell } from "@/shared/presentation/components/AppShell";
import { ResetPasswordForm } from "@/features/auth/presentation/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AppShell>
      <main className="min-h-dvh bg-cream text-ink">
        <ResetPasswordForm />
      </main>
    </AppShell>
  );
}
