import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/shared/config/env";
import { sendMail } from "@/shared/infrastructure/mail/mailer";

// Supabase generates the 6-digit code (generateLink returns it without sending any email);
// Nestora emails it through its own SMTP. The student never receives a confirmation link.

const lastSentAt = new Map<string, number>();

export function canSendCode(email: string) {
  const last = lastSentAt.get(email) ?? 0;
  return Date.now() - last >= env.otpResendSeconds * 1000;
}

async function emailCode(email: string, code: string, firstName?: string) {
  const minutes = Math.round(env.otpExpirySeconds / 60);
  const hello = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  await sendMail({
    to: email,
    subject: `${code} — ton code de vérification Nestora`,
    text: `${hello}\n\nTon code de vérification Nestora est : ${code}\nIl est valable ${minutes} minutes.\n\nSi tu n’as rien demandé, ignore cet email.`,
    html: `<!doctype html><html lang="fr"><body style="margin:0;padding:32px 16px;background:#f7f2e8;font-family:Inter,Arial,sans-serif;color:#1c2931">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;margin:0 auto;background:#fdf9f2;border:1px solid #d8ccbb;border-radius:20px"><tr><td style="padding:32px 28px;text-align:center">
<p style="margin:0;font-size:20px;font-weight:800;color:#163d50">nestora</p>
<h1 style="margin:24px 0 8px;font-size:24px;line-height:1.25">Entre le code reçu</h1>
<p style="margin:0;color:#6b7680;font-size:15px;line-height:1.5">${hello.replace(/[<>&]/g, "")} voici ton code de vérification.</p>
<p style="margin:24px 0;font-size:36px;font-weight:800;letter-spacing:10px;color:#163d50">${code}</p>
<p style="margin:0;color:#6b7680;font-size:13px;line-height:1.5">Ce code est valable ${minutes} minutes. Si tu n’as rien demandé, ignore cet email.</p>
</td></tr></table></body></html>`,
  });
  lastSentAt.set(email, Date.now());
}

// Creates the (unconfirmed) account and emails its code.
export async function createAccountAndSendCode(admin: SupabaseClient, input: { email: string; password: string; data: Record<string, unknown>; firstName: string }) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "signup", email: input.email, password: input.password, options: { data: input.data } });
  if (error) return { ok: false as const, error };
  await emailCode(input.email, data.properties.email_otp, input.firstName);
  return { ok: true as const, codeLength: data.properties.email_otp.length };
}

// New code for an existing account whose email is not confirmed yet.
export async function resendCode(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) return { ok: false as const, error };
  const firstName = typeof data.user.user_metadata?.first_name === "string" ? data.user.user_metadata.first_name : undefined;
  await emailCode(email, data.properties.email_otp, firstName);
  return { ok: true as const, codeLength: data.properties.email_otp.length };
}
