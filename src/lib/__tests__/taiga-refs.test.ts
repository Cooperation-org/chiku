import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import { describe, expect, it } from "vitest"
import { visit } from "unist-util-visit"
import type { Root } from "mdast"
import { remarkTaigaRefs } from "../taiga-refs"

function parse(source: string): Root {
  // Transformers (like remarkTaigaRefs) run during `run`, not `parse`.
  const processor = unified().use(remarkParse).use(remarkTaigaRefs).use(remarkGfm)
  return processor.runSync(processor.parse(source)) as Root
}

function collectNodes(tree: Root) {
  const links: { url: string; text: string }[] = []
  const mentions: string[] = []
  visit(tree, "link", (node) => {
    links.push({ url: node.url, text: (node.children[0] as { value: string }).value })
  })
  visit(tree, "strong", (node) => {
    const flagged = (node.data?.hProperties as Record<string, unknown> | undefined)?.["data-mention"]
    if (flagged) mentions.push((node.children[0] as { value: string }).value)
  })
  return { links, mentions }
}

describe("remarkTaigaRefs", () => {
  it("links taiga:us refs to the /s short link", () => {
    const { links } = collectNodes(parse("See taiga:us:123 for details"))
    expect(links).toEqual([{ url: "/s/123", text: "us #123" }])
  })

  it("flags @mentions without touching user emphasis", () => {
    const { mentions } = collectNodes(parse("ping @alice and **real bold** stays plain"))
    expect(mentions).toEqual(["@alice"])
  })

  it("does not match mentions inside emails", () => {
    const { mentions } = collectNodes(parse("mail bob@example.com or bob@test.io"))
    expect(mentions).toEqual([])
  })

  it("handles both refs in one text node, preserving surrounding text", () => {
    const tree = parse("hey @bob try taiga:us:7 now")
    const texts: string[] = []
    visit(tree, "text", (node) => texts.push(node.value))
    const flattened = texts.join("|")
    expect(flattened).toContain("hey ")
    expect(flattened).toContain(" try ")
    expect(flattened).toContain(" now")
    const { links, mentions } = collectNodes(tree)
    expect(links).toEqual([{ url: "/s/7", text: "us #7" }])
    expect(mentions).toEqual(["@bob"])
  })

  it("leaves other taiga refs and unknown tokens literal", () => {
    const source = "track taiga:task:5 and taiga:epic:2 but not taiga:us:9 twice"
    const { links } = collectNodes(parse(source))
    expect(links).toEqual([{ url: "/s/9", text: "us #9" }])
  })

  it("never rewrites refs inside fenced code or code spans", () => {
    const { links, mentions } = collectNodes(parse("`taiga:us:1` and\n```\ntaiga:us:2 @eve\n```"))
    expect(links).toEqual([])
    expect(mentions).toEqual([])
  })

  it("coexists with GFM tables", () => {
    const source = "| a | b |\n| - | - |\n| taiga:us:3 | @carol |"
    const { links, mentions } = collectNodes(parse(source))
    expect(links).toEqual([{ url: "/s/3", text: "us #3" }])
    expect(mentions).toEqual(["@carol"])
  })
})
