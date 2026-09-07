import { useToolbarSlots } from "@/lib/stores/toolbar-slots"

// Module-level ref callbacks: stable identity (no detach/attach churn) and
// no hooks — registration happens in the commit phase, not in an effect.
function breadcrumbRef(el: HTMLElement | null) {
  useToolbarSlots.getState().setBreadcrumbEl(el)
}

function actionsRef(el: HTMLElement | null) {
  useToolbarSlots.getState().setActionsEl(el)
}

/**
 * Portal targets declared by the story route via staticData. `display:
 * contents` keeps them layout-invisible so portaled header groups behave as
 * direct flex items of the toolbar.
 */
export function StoryBreadcrumbSlot() {
  return <span ref={breadcrumbRef} className="contents" />
}

export function StoryActionsSlot() {
  return <span ref={actionsRef} className="contents" />
}
