import { visit, SKIP } from "unist-util-visit"
import type { Content, Root } from "mdast"
import type { Plugin } from "unified"

/**
 * Taiga-flavored references → markdown nodes, at the AST level (so code
 * blocks and code spans are never mangled):
 * - `taiga:us:123` → internal link to the `/s/123` short link
 * - `@mention`     → emphasis flagged via hProperties (the Markdown
 *   component renders it as an accent chip; user emphasis is untouched)
 * - other `taiga:*` refs (task/issue/epic/wiki) stay literal — no deep
 *   routes exist for them
 */

const STORY_REF = String.raw`\btaiga:us:(\d+)\b`
const MENTION = String.raw`(?<![\w.@-])@([\w][\w.-]*)`
const REF_PATTERN = new RegExp(`${STORY_REF}|${MENTION}`, "g")

export const remarkTaigaRefs: Plugin<[], Root> = () => (tree) => {
  visit(tree, "text", (node, index, parent) => {
    if (index == null || parent == null) return
    const value = node.value
    if (!value) return

    const segments: Content[] = []
    let cursor = 0
    let match: RegExpExecArray | null

    const pushText = (end: number) => {
      if (cursor < end) segments.push({ type: "text", value: value.slice(cursor, end) })
    }

    REF_PATTERN.lastIndex = 0
    while ((match = REF_PATTERN.exec(value)) !== null) {
      const storyId = match[1]
      const mentionName = match[2]
      pushText(match.index)
      if (storyId) {
        segments.push({
          type: "link",
          url: `/s/${storyId}`,
          title: null,
          children: [{ type: "text", value: `us #${storyId}` }],
        })
      } else if (mentionName) {
        segments.push({
          type: "strong",
          data: { hProperties: { "data-mention": true } },
          children: [{ type: "text", value: `@${mentionName}` }],
        })
      }
      cursor = match.index + match[0].length
    }

    if (segments.length === 0) return
    pushText(value.length)
    parent.children.splice(index, 1, ...segments)
    return [SKIP, index + segments.length]
  })
}
