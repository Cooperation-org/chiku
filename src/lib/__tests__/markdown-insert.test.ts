import { describe, expect, it } from "vitest"
import { insertBlock, insertPrefixLines, TABLE_SNIPPET, wrapSelection } from "../markdown-insert"

describe("wrapSelection", () => {
  it("wraps a non-empty selection and keeps it selected inside the markers", () => {
    const r = wrapSelection("hello world", 0, 5, "**", "**")
    expect(r.text).toBe("**hello** world")
    expect(r.selectionStart).toBe(2)
    expect(r.selectionEnd).toBe(7)
  })

  it("inserts an empty pair at the caret when the selection is empty", () => {
    const r = wrapSelection("ab", 1, 1, "*", "*")
    expect(r.text).toBe("a**b")
    expect(r.selectionStart).toBe(2)
    expect(r.selectionEnd).toBe(2)
  })

  it("supports asymmetric markers like links", () => {
    const r = wrapSelection("", 0, 0, "[", "](url)")
    expect(r.text).toBe("[](url)")
    expect(r.selectionStart).toBe(1)
    expect(r.selectionEnd).toBe(1)
  })
})

describe("insertPrefixLines", () => {
  it("prefixes every selected line", () => {
    const r = insertPrefixLines("one\ntwo\nthree", 4, 8, "- ")
    expect(r.text).toBe("one\n- two\n- three")
    expect(r.selectionEnd).toBe(r.text.length)
  })

  it("toggles off when every line already carries the prefix", () => {
    const r = insertPrefixLines("- one\n- two", 0, 6, "- ")
    expect(r.text).toBe("one\ntwo")
    expect(r.selectionStart).toBe(0)
  })

  it("treats a bare caret as its own line, selecting the prefixed line", () => {
    const r = insertPrefixLines("word", 2, 2, "1. ")
    expect(r.text).toBe("1. word")
    expect(r.selectionStart).toBe(3)
    expect(r.selectionEnd).toBe(7)
  })

  it("keeps already-prefixed lines intact when mixing", () => {
    const r = insertPrefixLines("- one\ntwo", 0, 8, "- ")
    expect(r.text).toBe("- one\n- two")
  })

  it("works for quote and heading prefixes", () => {
    expect(insertPrefixLines("note", 0, 4, "> ").text).toBe("> note")
    expect(insertPrefixLines("title", 0, 5, "## ").text).toBe("## title")
  })
})

describe("insertBlock", () => {
  it("inserts a table with clean newline separation", () => {
    const r = insertBlock("before|after", 6, 6, TABLE_SNIPPET)
    expect(r.text).toBe(`before\n${TABLE_SNIPPET}\n|after`)
    expect(r.selectionStart).toBe(8 + TABLE_SNIPPET.length)
  })

  it("does not double newlines at paragraph boundaries", () => {
    const r = insertBlock("para\n", 5, 5, "---")
    expect(r.text).toBe("para\n---")
  })

  it("replaces a selection with the block", () => {
    const r = insertBlock("keep this gone keep", 5, 9, "---")
    expect(r.text).toBe("keep \n---\n gone keep")
  })
})
