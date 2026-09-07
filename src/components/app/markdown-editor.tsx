import { useRef, useState } from "react"
import {
  Bold,
  ChevronDown,
  Code,
  Eye,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  PencilLine,
  Plus,
  Strikethrough,
  Table,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { insertBlock, insertPrefixLines, TABLE_SNIPPET, wrapSelection } from "@/lib/markdown-insert"
import { cn } from "cn"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  /** Fires only from the textarea — toolbar clicks never steal focus. */
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
  autoFocus?: boolean
  ariaLabel?: string
  className?: string
}

interface WrapAction {
  kind: "wrap"
  before: string
  after: string
}

interface PrefixAction {
  kind: "prefix"
  prefix: string
}

interface BlockAction {
  kind: "block"
  block: string
}

type ToolbarAction = WrapAction | PrefixAction | BlockAction

function applyAction(
  text: string,
  start: number,
  end: number,
  action: ToolbarAction,
): { text: string; selectionStart: number; selectionEnd: number } {
  switch (action.kind) {
    case "wrap":
      return wrapSelection(text, start, end, action.before, action.after)
    case "prefix":
      return insertPrefixLines(text, start, end, action.prefix)
    case "block":
      return insertBlock(text, start, end, action.block)
  }
}

function ToolButton({
  icon: Icon,
  label,
  action,
  onApply,
}: {
  icon: typeof Bold
  label: string
  action: ToolbarAction
  onApply: (action: ToolbarAction) => void
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      // Keep focus (and the selection) on the textarea — never blur-to-save.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onApply(action)}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}

/**
 * GitLab-style markdown editor: Write/Preview tabs over a formatting
 * toolbar. Preview renders through the same pipeline as the read view.
 */
export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  rows = 6,
  autoFocus,
  ariaLabel,
  className,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function apply(action: ToolbarAction) {
    const el = textareaRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const result = applyAction(value, start, end, action)
    onChange(result.text)
    // Restore focus/selection once React commits the new value.
    requestAnimationFrame(() => {
      const target = textareaRef.current
      target?.focus()
      target?.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  const actions: { icon: typeof Bold; label: string; action: ToolbarAction }[] = [
    { icon: Bold, label: "Bold", action: { kind: "wrap", before: "**", after: "**" } },
    { icon: Italic, label: "Italic", action: { kind: "wrap", before: "*", after: "*" } },
    { icon: Strikethrough, label: "Strikethrough", action: { kind: "wrap", before: "~~", after: "~~" } },
    { icon: Code, label: "Inline code", action: { kind: "wrap", before: "`", after: "`" } },
    { icon: Link2, label: "Link", action: { kind: "wrap", before: "[", after: "](url)" } },
    { icon: List, label: "Bulleted list", action: { kind: "prefix", prefix: "- " } },
    { icon: ListOrdered, label: "Numbered list", action: { kind: "prefix", prefix: "1. " } },
    { icon: ListTodo, label: "Task list", action: { kind: "prefix", prefix: "- [ ] " } },
    { icon: Table, label: "Table", action: { kind: "block", block: TABLE_SNIPPET } },
  ]

  return (
    <div
      className={cn(
        "bg-background focus-within:border-ring focus-within:ring-ring/50 rounded-md border transition-shadow focus-within:ring-2",
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 gap-1 px-2 text-xs", tab === "write" && "text-foreground bg-accent font-medium")}
            // Same as the formatting buttons — never blur the textarea.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTab("write")}
          >
            <PencilLine className="h-3.5 w-3.5" />
            Write
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 gap-1 px-2 text-xs", tab === "preview" && "text-foreground bg-accent font-medium")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTab("preview")}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          {actions.slice(0, 5).map((a) => (
            <ToolButton key={a.label} icon={a.icon} label={a.label} action={a.action} onApply={apply} />
          ))}
          <span aria-hidden className="bg-border mx-1 h-5 w-px" />
          {actions.slice(5).map((a) => (
            <ToolButton key={a.label} icon={a.icon} label={a.label} action={a.action} onApply={apply} />
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-7 gap-0.5 px-1.5" title="More formatting" aria-label="More formatting" />}>
              <Plus className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply({ kind: "prefix", prefix: "## " })}
              >
                Heading
              </DropdownMenuItem>
              <DropdownMenuItem
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply({ kind: "prefix", prefix: "> " })}
              >
                Quote
              </DropdownMenuItem>
              <DropdownMenuItem
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply({ kind: "wrap", before: "```\n", after: "\n```" })}
              >
                Code block
              </DropdownMenuItem>
              <DropdownMenuItem
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply({ kind: "block", block: "---" })}
              >
                <Minus className="h-4 w-4" />
                Divider
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {tab === "write" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === "Tab" && !e.shiftKey) {
              e.preventDefault()
              const el = e.currentTarget
              onChange(value.slice(0, el.selectionStart) + "  " + value.slice(el.selectionEnd))
              const caret = el.selectionStart + 2
              requestAnimationFrame(() => el.setSelectionRange(caret, caret))
            }
            onKeyDown?.(e)
          }}
          rows={rows}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          className="placeholder:text-muted-foreground w-full resize-y bg-transparent px-3 py-2.5 font-mono text-sm outline-none"
        />
      ) : (
        <div
          className="prose prose-sm dark:prose-invert min-h-24 max-h-96 max-w-none overflow-y-auto px-3 py-2.5"
          style={{ minHeight: rows * 24 }}
        >
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  )
}
