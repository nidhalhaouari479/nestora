function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  otpLength: readNumber(process.env.NEXT_PUBLIC_OTP_LENGTH, 6),
  otpExpirySeconds: readNumber(process.env.NEXT_PUBLIC_OTP_EXPIRY_SECONDS, 600),
  otpResendSeconds: readNumber(process.env.NEXT_PUBLIC_OTP_RESEND_SECONDS, 60),
  // Company bank account shown in the Instant Booking popup (P21B). Empty = demo value.
  companyRib: process.env.NEXT_PUBLIC_COMPANY_RIB ?? "",
  companyBank: process.env.NEXT_PUBLIC_COMPANY_BANK ?? "",
};
