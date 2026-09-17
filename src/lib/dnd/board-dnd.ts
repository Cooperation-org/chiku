import { KeyboardSensor, PointerSensor } from "@dnd-kit/react"
import { PointerActivationConstraints } from "@dnd-kit/dom"

// Board drag configuration. The single <DragDropProvider> lives in AppShell
// (mounted for the whole app lifetime), so the session survives route
// changes — board columns/cards, the toolbar sprint rail, and the drag
// overlay all consume that one session via hooks. Never create extra
// providers sharing a manager: each provider destroys its manager on
// unmount, which wedges every other consumer until refresh.
//
// Drags only start after the pointer moved 8px (community norm): plain
// clicks — and their inevitable 1–3px of jitter — navigate normally instead
// of being swallowed as micro-drags. KeyboardSensor is listed explicitly
// because passing `sensors` replaces the library defaults. Module scope, so
// the config is created once and no hooks are involved.
export const boardDragSensors = [
  PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
  }),
  KeyboardSensor,
]
