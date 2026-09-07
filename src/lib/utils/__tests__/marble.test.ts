import { describe, expect, it } from "vitest"
import { marbleGradient } from "../marble"

describe("marbleGradient", () => {
  it("is deterministic — the same name always yields the same gradient", () => {
    expect(marbleGradient("Alex Alkhateeb")).toBe(marbleGradient("Alex Alkhateeb"))
  })

  it("distinguishes people who share initials", () => {
    expect(marbleGradient("Alex Alkhateeb")).not.toBe(marbleGradient("Alicia Alan"))
  })

  it("differs on case and spacing too", () => {
    expect(marbleGradient("Jane Doe")).not.toBe(marbleGradient("jane doe"))
    expect(marbleGradient("Jane Doe")).not.toBe(marbleGradient("Jane  Doe"))
  })

  it("is a layered radial-gradient over a base color", () => {
    const css = marbleGradient("Test User")
    expect(css).toContain("radial-gradient")
    expect((css.match(/radial-gradient/g) ?? []).length).toBe(3)
    expect(css).toMatch(/hsl\(/)
  })

  it("keeps hues inside the color wheel", () => {
    for (const name of ["A", "Zoe Ng", "Renée Descartes", "	tab", ""]) {
      const css = marbleGradient(name)
      const hues = [...css.matchAll(/hsl\((\d+)/g)].map((m) => Number(m[1]))
      expect(hues.length).toBeGreaterThan(0)
      for (const hue of hues) expect(hue).toBeGreaterThanOrEqual(0)
      for (const hue of hues) expect(hue).toBeLessThan(360)
    }
  })
})
