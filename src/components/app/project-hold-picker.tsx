import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "@tanstack/react-router"
import { useHotkey } from "@tanstack/react-hotkeys"
import { formatForDisplay } from "@tanstack/react-hotkeys"
import { Check } from "lucide-react"
import { Avatar } from "@/components/app/avatar"
import { shortcutMeta } from "@/lib/hotkeys/shortcuts"
import { useProjects } from "@/lib/queries/projects"
import { isArchived } from "@/lib/api/projects"
import { useCommandPaletteStore } from "@/lib/stores/command-palette"
import { useProjectStore } from "@/lib/stores/project"

/** Keydown-hold duration before the tap becomes a hold-and-cycle session. */
const HOLD_ENTER_MS = 350

interface HoldSession {
  pending: boolean
  holding: boolean
  timer: number
  index: number
}

/**
 * Alt-Tab style project switching on Mod+Shift+P:
 * - tap → opens the command palette in projects mode
 * - hold past 350ms → overlay appears; press (or keep holding) P to cycle,
 *   release the combo to confirm.
 */
export function ProjectHoldPicker() {
  const navigate = useNavigate()
  const setSelectedSlug = useProjectStore((s) => s.setSelectedSlug)
  const selectedSlug = useProjectStore((s) => s.selectedSlug)
  const { data: projects } = useProjects()

  const active = (projects ?? []).filter((p) => !isArchived(p))
  const params = useParams({ strict: false })
  const activeSlug = ((params as { slug?: string }).slug ?? selectedSlug) as string | null
  const currentIndex = active.findIndex((p) => p.slug === activeSlug)

  const [holding, setHolding] = useState(false)
  const [index, setIndex] = useState(0)

  const session = useRef<HoldSession>({
    pending: false,
    holding: false,
    timer: 0,
    index: 0,
  })

  // The document-level keyup listener is registered once; it reads the
  // freshest list and commit through these refs (synced after every render).
  const latest = useRef({ active, currentIndex, activeSlug })
  const commitRef = useRef<(i: number) => void>(() => {})

  const commit = useCallback(
    (i: number) => {
      const { active: list, activeSlug: slug } = latest.current
      const p = list[i]
      if (!p) return
      if (p.slug !== slug) {
        setSelectedSlug(p.slug)
        navigate({ to: "/projects/$slug/board", params: { slug: p.slug } })
      }
    },
    [setSelectedSlug, navigate],
  )

  useEffect(() => {
    latest.current = { active, currentIndex, activeSlug }
    commitRef.current = commit
  })

  function begin() {
    const st = session.current
    if (st.pending || st.holding) return
    st.pending = true
    st.index = latest.current.currentIndex >= 0 ? latest.current.currentIndex : 0
    setIndex(st.index)
    st.timer = window.setTimeout(() => {
      if (!st.pending) return
      st.pending = false
      st.holding = true
      setHolding(true)
    }, HOLD_ENTER_MS)
  }

  useHotkey(
    "Mod+Shift+P",
    (event) => {
      const st = session.current
      if (latest.current.active.length === 0) return
      if (st.holding) {
        const next = (st.index + 1) % latest.current.active.length
        st.index = next
        setIndex(next)
        return
      }
      if (st.pending || event.repeat) return
      begin()
    },
    { meta: shortcutMeta("projects.hold") },
  )

  useEffect(() => {
    function onKeyUp(event: KeyboardEvent) {
      const st = session.current
      if (!st.pending && !st.holding) return
      const key = event.key
      const isComboKey =
        key === "p" || key === "P" || key === "Shift" || key === "Control" || key === "Meta"
      if (!isComboKey) return
      // Only end the session once every combo key has been released.
      if (event.ctrlKey || event.metaKey || event.shiftKey) return

      window.clearTimeout(st.timer)
      if (st.holding) {
        st.holding = false
        setHolding(false)
        commitRef.current(st.index)
      } else if (st.pending) {
        // Quick tap: project list in the palette.
        useCommandPaletteStore.getState().openPalette("projects")
      }
      st.pending = false
    }

    document.addEventListener("keyup", onKeyUp)
    return () => document.removeEventListener("keyup", onKeyUp)
  }, [])

  useEffect(() => () => window.clearTimeout(session.current.timer), [])

  if (!holding || active.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center pointer-events-none">
      <div className="bg-popover text-popover-foreground pointer-events-auto min-w-72 overflow-hidden rounded-xl border p-2 shadow-xl">
        <p className="text-muted-foreground px-2 py-1 text-xs">
          Hold{" "}
          <span className="text-foreground font-medium">
            {formatForDisplay("Mod+Shift+P")}
          </span>{" "}
          · press P to cycle · release to switch
        </p>
        <div className="mt-1 space-y-0.5">
          {active.map((p, i) => (
            <div
              key={p.id}
              className={
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm " +
                (i === index ? "bg-accent text-accent-foreground" : "")
              }
            >
              <Avatar name={p.name} variant="marble" size="sm" className="text-white" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.slug === activeSlug && <Check className="text-muted-foreground size-4" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
