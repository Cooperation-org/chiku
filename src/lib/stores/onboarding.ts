import { create } from "zustand"

const KEY = "chiku:onboarded:v1"

export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(KEY) === "1"
  } catch {
    return true
  }
}

export function markOnboardingSeen(): void {
  try {
    window.localStorage.setItem(KEY, "1")
  } catch {
    // Private mode etc — onboarding just shows again next visit.
  }
}

export function clearOnboardingSeen(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/**
 * Deterministic screenshot hook for the LinkedIn launch post and manual QA:
 * any authed URL with `?onboarding=preview` forces the dialog open without
 * touching localStorage. Read straight from window.location so no route's
 * validateSearch needs to allowlist the param.
 */
export function isOnboardingPreview(): boolean {
  if (typeof window === "undefined") return false
  try {
    return new URLSearchParams(window.location.search).get("onboarding") === "preview"
  } catch {
    return false
  }
}

/**
 * Don't hijack deep links: when the URL already points at a story, comment,
 * or sprint scope, the story/sprint UI owns the first paint — not the tour.
 * Preview mode overrides this so the hero shot is reproducible anywhere.
 */
export function isDeepLink(): boolean {
  if (typeof window === "undefined") return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.has("story") || params.has("comment") || params.has("sprint")) return true
    return /\/board\/[^/]+\/?$/.test(window.location.pathname) || /\/s\/[^/]+\/?$/.test(window.location.pathname)
  } catch {
    return false
  }
}

interface OnboardingState {
  open: boolean
  step: number
  setOpen: (open: boolean) => void
  setStep: (step: number) => void
  dismiss: (persist?: boolean) => void
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  open: false,
  step: 0,
  setOpen: (open) => set({ open }),
  setStep: (step) => set({ step }),
  dismiss: (persist = true) => {
    if (persist) markOnboardingSeen()
    set({ open: false })
  },
}))

/** First-run decision: preview forces open, deep links stay quiet, otherwise once per browser. */
export function shouldAutoOpenOnboarding(): boolean {
  if (isOnboardingPreview()) return true
  if (isDeepLink()) return false
  return !hasSeenOnboarding()
}
