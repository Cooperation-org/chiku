// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import {
  clearOnboardingSeen,
  hasSeenOnboarding,
  isDeepLink,
  isOnboardingPreview,
  markOnboardingSeen,
  shouldAutoOpenOnboarding,
} from "@/lib/stores/onboarding"

function setUrl(url: string) {
  window.history.replaceState(null, "", url)
}

beforeEach(() => {
  window.localStorage.clear()
  setUrl("/")
})

describe("onboarding seen flag", () => {
  it("is unseen by default, persists after dismiss", () => {
    expect(hasSeenOnboarding()).toBe(false)
    markOnboardingSeen()
    expect(hasSeenOnboarding()).toBe(true)
    clearOnboardingSeen()
    expect(hasSeenOnboarding()).toBe(false)
  })
})

describe("shouldAutoOpenOnboarding", () => {
  it("opens for first-time visitors on plain app URLs", () => {
    setUrl("/projects/demo/board")
    expect(shouldAutoOpenOnboarding()).toBe(true)
  })

  it("stays quiet once seen", () => {
    markOnboardingSeen()
    setUrl("/projects/demo/board")
    expect(shouldAutoOpenOnboarding()).toBe(false)
  })

  it("never hijacks story/sprint deep links", () => {
    for (const url of [
      "/projects/demo/board/42",
      "/s/123",
      "/projects/demo/board?sprint=12",
      "/projects/demo/board?story=42",
      "/projects/demo/board?comment=7",
    ]) {
      setUrl(url)
      expect(isDeepLink()).toBe(true)
      expect(shouldAutoOpenOnboarding()).toBe(false)
    }
  })

  it("preview param forces open anywhere without persisting", () => {
    markOnboardingSeen()
    setUrl("/projects/demo/board/42?onboarding=preview")
    expect(isOnboardingPreview()).toBe(true)
    expect(shouldAutoOpenOnboarding()).toBe(true)
    expect(hasSeenOnboarding()).toBe(true)
  })
})
