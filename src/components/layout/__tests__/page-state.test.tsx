// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PageTransition } from "@/components/layout/page-transition"
import { PageError, PageLoading, PageNotFound } from "@/components/layout/page-state"

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}))

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

beforeEach(() => {
  stubMatchMedia(false)
})

describe("PageLoading", () => {
  it("announces itself as a live status with the given label", () => {
    render(<PageLoading label="Loading board" />)
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByText("Loading board…")).toBeInTheDocument()
  })
})

describe("PageError", () => {
  it("shows the message and fires an explicit retry handler", () => {
    const onRetry = vi.fn()
    render(<PageError message="Board failed." onRetry={onRetry} />)
    expect(screen.getByText("Board failed.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe("PageNotFound", () => {
  it("renders default copy and an optional action", () => {
    render(<PageNotFound action={<button>Go home</button>} />)
    expect(screen.getByText("Page not found")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Go home" })).toBeInTheDocument()
  })
})

describe("PageTransition", () => {
  it("renders children with and without reduced motion", () => {
    const { unmount } = render(
      <PageTransition>
        <p>board content</p>
      </PageTransition>
    )
    expect(screen.getByText("board content")).toBeInTheDocument()
    unmount()

    stubMatchMedia(true)
    render(
      <PageTransition>
        <p>reduced content</p>
      </PageTransition>
    )
    expect(screen.getByText("reduced content")).toBeInTheDocument()
  })
})
