import { NextResponse } from "next/server";
import { env } from "@/shared/config/env";
import { getSupabaseAdminClient } from "@/shared/infrastructure/supabase/admin-client";
import { isValidEmail, normalizeEmail } from "@/features/auth/application/credentials";
import { canSendCode, resendCode } from "@/features/auth/infrastructure/verification-code";

// P03B "Renvoyer". Always answers the same way so it cannot be used to discover accounts.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = normalizeEmail(body.email ?? "");
  if (!isValidEmail(email)) return NextResponse.json({ ok: false, message: "Adresse email invalide." }, { status: 400 });
  if (!canSendCode(email)) {
    return NextResponse.json({ ok: false, message: `Patiente ${env.otpResendSeconds} secondes avant de redemander un code.` }, { status: 429 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });

  // Only accounts still waiting for confirmation get a code.
  const { data: profile } = await admin.from("student_profiles").select("is_email_verified").eq("email", email).limit(1).maybeSingle();
  let codeLength: number | undefined;
  if (profile && !profile.is_email_verified) {
    try {
      const result = await resendCode(admin, email);
      if (result.ok) codeLength = result.codeLength;
    } catch (error) {
      console.error("[resend-code]", error);
      return NextResponse.json({ ok: false, message: "L’email n’a pas pu partir. Réessaie dans un instant." }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true, codeLength });
}
