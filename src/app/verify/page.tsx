import { AppShell } from "@/shared/presentation/components/AppShell";
import { OtpVerification } from "@/features/auth/presentation/OtpVerification";

export default function VerifyPage() {
  return (
    <AppShell>
      <main className="min-h-dvh bg-cream text-ink">
        <OtpVerification />
      </main>
    </AppShell>
  );
}
