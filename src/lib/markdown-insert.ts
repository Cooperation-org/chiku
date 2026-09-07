export interface SelectionEdit {
  text: string
  selectionStart: number
  selectionEnd: number
}

/**
 * Wrap the selection (or the caret, when empty) with `before`/`after`
 * markdown markers. Non-empty selections end up selected inside the wrap;
 * empty ones leave the caret between the markers.
 */
export function wrapSelection(
  text: string,
  selStart: number,
  selEnd: number,
  before: string,
  after: string,
): SelectionEdit {
  if (selStart === selEnd) {
    const next = text.slice(0, selStart) + before + after + text.slice(selEnd)
    const caret = selStart + before.length
    return { text: next, selectionStart: caret, selectionEnd: caret }
  }
  const next =
    text.slice(0, selStart) + before + text.slice(selStart, selEnd) + after + text.slice(selEnd)
  return {
    text: next,
    selectionStart: selStart + before.length,
    selectionEnd: selEnd + before.length,
  }
}

/**
 * Apply a line prefix (list markers, quote, heading) to every line touched
 * by the selection — toggling off when every line already carries it.
 * Selection covers the affected lines afterwards.
 */
export function insertPrefixLines(
  text: string,
  selStart: number,
  selEnd: number,
  prefix: string,
): SelectionEdit {
  const lineStart = text.lastIndexOf("\n", Math.max(selStart - 1, 0)) + 1
  let lineEnd = text.indexOf("\n", selEnd)
  if (lineEnd === -1) lineEnd = text.length

  const block = text.slice(lineStart, lineEnd)
  const lines = block.split("\n")
  const hasPrefix = (line: string) => line.startsWith(prefix)
  const allHave = lines.every(hasPrefix)

  const next = lines
    .map((line) => {
      if (allHave) return line.slice(prefix.length)
      return hasPrefix(line) ? line : prefix + line
    })
    .join("\n")

  const delta = next.length - block.length
  return {
    text: text.slice(0, lineStart) + next + text.slice(lineEnd),
    selectionStart: allHave
      ? lineStart
      : selStart === selEnd
        ? lineStart + prefix.length
        : Math.max(lineStart, selStart + (delta > 0 ? prefix.length : delta)),
    selectionEnd: lineStart + next.length,
  }
}

/**
 * Replace the selection with a block snippet (table, code fence, divider),
 * keeping it separated from surrounding text by newlines. Caret lands at
 * the end of the inserted block.
 */
export function insertBlock(
  text: string,
  selStart: number,
  selEnd: number,
  block: string,
): SelectionEdit {
  const needsLeading = selStart > 0 && text[selStart - 1] !== "\n"
  const needsTrailing = selEnd < text.length && text[selEnd] !== "\n"
  const insert = (needsLeading ? "\n" : "") + block + (needsTrailing ? "\n" : "")
  const next = text.slice(0, selStart) + insert + text.slice(selEnd)
  const caret = selStart + insert.length
  return { text: next, selectionStart: caret, selectionEnd: caret }
}

export const TABLE_SNIPPET = "|  |  |\n| --- | --- |\n|  |  |"
