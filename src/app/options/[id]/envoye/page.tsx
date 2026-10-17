import type { Metadata } from "next";
import { AppShell } from "@/shared/presentation/components/AppShell";
import { BookingSent } from "@/features/holds/presentation/BookingSent";

export const metadata: Metadata = { title: "Instant Booking envoyé · Nestora" };

// P23 — status right after the Instant Booking.
export default async function BookingSentPage({ params }: PageProps<"/options/[id]/envoye">) {
  const { id } = await params;
  return (
    <AppShell>
      <main className="booking-screen">
        <BookingSent id={id} />
      </main>
    </AppShell>
  );
}
