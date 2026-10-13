"use client";

import type { OnboardingProfile } from "../domain/onboarding-profile";

const STORAGE_KEY = "nestora:onboarding-profile";

export function saveOnboardingProfile(profile: OnboardingProfile) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getOnboardingProfile(): OnboardingProfile | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OnboardingProfile;
  } catch {
    return null;
  }
}
