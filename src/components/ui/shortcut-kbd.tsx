import {
  formatForDisplay,
  type HotkeySequence,
  type RegisterableHotkey,
} from "@tanstack/react-hotkeys"
import { ChevronRight } from "lucide-react"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { shortcutById, type ShortcutId } from "@/lib/hotkeys/shortcuts"

/**
 * Renders canonical shortcut combos/sequences from the hotkeys registry as
 * Kbd chips, using the library's own display formatting — ⌘⇧ symbols on
 * macOS, Ctrl/Shift text on Windows/Linux. No key-mapping logic lives here.
 */

/** Private separator so multi-word keys survive the token split. */
const SEP = "\u001f"

function comboTokens(combo: RegisterableHotkey): string[] {
  return formatForDisplay(combo, { separatorToken: SEP })
    .split(SEP)
    .map((token) => token.trim())
    .filter(Boolean)
}

function KbdCombo({ combo }: { combo: RegisterableHotkey }) {
  return comboTokens(combo).map((token, i) => <Kbd key={i}>{token}</Kbd>)
}

interface ShortcutHintProps {
  /** Render a combo/sequence straight from the registry. */
  id?: ShortcutId
  /** Render an ad-hoc canonical combo, e.g. "Mod+K". */
  hotkey?: RegisterableHotkey
  /** Render an ad-hoc sequence, e.g. ["Mod+Shift+P", "1"]. */
  sequence?: HotkeySequence
  className?: string
}

export function ShortcutHint({ id, hotkey, sequence, className }: ShortcutHintProps) {
  const def = id ? shortcutById(id) : undefined
  const combo = hotkey ?? def?.hotkey
  const steps = sequence ?? def?.sequence

  if (steps && steps.length > 0) {
    return (
      <KbdGroup className={className}>
        {steps.map((step, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight aria-hidden className="text-muted-foreground/60 size-3" />}
            <KbdCombo combo={step} />
          </span>
        ))}
      </KbdGroup>
    )
  }

  if (combo) {
    return (
      <KbdGroup className={className}>
        <KbdCombo combo={combo} />
      </KbdGroup>
    )
  }

  return null
}

/** Plain-text rendering (tooltips, aria-labels, the hold-picker hint). */
export function shortcutText(id: ShortcutId): string {
  const def = shortcutById(id)
  if (!def) return ""
  if (def.sequence) return def.sequence.map((s) => formatForDisplay(s)).join(" then ")
  return def.hotkey ? formatForDisplay(def.hotkey) : ""
}
