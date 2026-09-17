import { KeyboardSensor, PointerSensor } from "@dnd-kit/react"
import { DragDropManager, PointerActivationConstraints } from "@dnd-kit/dom"

// Shared drag session for the board. The board and the toolbar sprint rail
// live in different parts of the tree (page body vs app bar), so they can't
// share one <DragDropProvider> — instead both providers run on this manager
// singleton and drags flow between them. Module scope: created once, no hooks.
//
// Drags only start after the pointer moved 8px (community norm): plain
// clicks — and their inevitable 1–3px of jitter — navigate normally instead
// of being swallowed as micro-drags. KeyboardSensor is listed explicitly
// because passing `sensors` replaces the library defaults.
export const boardDragSensors = [
  PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
  }),
  KeyboardSensor,
]

export const boardDragManager = new DragDropManager({ sensors: boardDragSensors })
