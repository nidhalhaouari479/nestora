export type OnboardingProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  // Length of the code actually emailed (Supabase "Email OTP Length": 6 to 10).
  codeLength?: number;
};
