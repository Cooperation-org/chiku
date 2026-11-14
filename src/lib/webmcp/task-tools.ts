import { createUserStory, getUserStory, getUserStoryByRef } from "@/lib/api/userstories"
import { api } from "@/lib/api/client"

/**
 * Show an in-page confirmation modal and resolve to true (delete) or false (cancel).
 * Uses a custom modal (not window.confirm) so it can be interacted with by
 * browsers, agents, and automation alike.
 */
function confirmDelete(ref: number, subject: string): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const overlay = document.createElement("div")
		overlay.id = "webmcp-delete-confirm-overlay"
		overlay.style.cssText =
			"position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);"

		const card = document.createElement("div")
		card.style.cssText =
			"background:#fff;color:#111;padding:24px;border-radius:8px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.35);font-family:system-ui,sans-serif;"

		const title = document.createElement("h3")
		title.style.cssText = "margin:0 0 8px;font-size:16px;font-weight:600;"
		title.textContent = `Delete task #${ref}?`

		const body = document.createElement("p")
		body.style.cssText = "margin:0 0 20px;color:#555;font-size:14px;line-height:1.4;"
		body.textContent = `${subject}\n\nThis action cannot be undone.`

		const actions = document.createElement("div")
		actions.style.cssText = "display:flex;gap:8px;justify-content:flex-end;"

		const cancelBtn = document.createElement("button")
		cancelBtn.id = "webmcp-delete-cancel"
		cancelBtn.textContent = "Cancel"
		cancelBtn.style.cssText =
			"padding:8px 16px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:14px;"

		const deleteBtn = document.createElement("button")
		deleteBtn.id = "webmcp-delete-confirm"
		deleteBtn.textContent = "Delete"
		deleteBtn.style.cssText =
			"padding:8px 16px;border:none;border-radius:4px;background:#dc2626;color:#fff;cursor:pointer;font-size:14px;"

		actions.appendChild(cancelBtn)
		actions.appendChild(deleteBtn)
		card.appendChild(title)
		card.appendChild(body)
		card.appendChild(actions)
		overlay.appendChild(card)
		document.body.appendChild(overlay)

		const cleanup = () => overlay.remove()
		cancelBtn.addEventListener("click", () => {
			cleanup()
			resolve(false)
		})
		deleteBtn.addEventListener("click", () => {
			cleanup()
			resolve(true)
		})
	})
}
import { getProject, getProjectBySlug, getProjects } from "@/lib/api/projects"
import { queryClient, qk } from "@/lib/query"
import { useProjectStore } from "@/lib/stores/project"
import type { Project, UserStory } from "@/lib/api/types"

/**
 * Resolve a project from a loose identifier (numeric id, slug, or undefined
 * to fall back to the last selected project). Throws if nothing resolves.
 */
export async function resolveProject(project?: string): Promise<Project> {
	if (project?.trim()) {
		const n = Number(project)
		if (!Number.isNaN(n) && project.trim() !== "") {
			return getProject(n)
		}
		return getProjectBySlug(project.trim())
	}
	const slug = useProjectStore.getState().getSavedSlug()
	if (slug) {
		try {
			return await getProjectBySlug(slug)
		} catch {
			// fall through to first project
		}
	}
	const projects = await getProjects()
	if (!projects.length) throw new Error("No projects available")
	return projects[0]
}

export interface AddTaskInput {
	project?: string
	subject: string
	description?: string
	status?: number
	assigned_to?: number | null
	due_date?: string | null
	milestone?: number | null
	tags?: string[]
	is_blocked?: boolean
	blocked_note?: string
}

export async function addTask(input: AddTaskInput): Promise<UserStory> {
	const project = await resolveProject(input.project)
	const created = await createUserStory({
		project: project.id,
		subject: input.subject.trim(),
		description: input.description?.trim() || undefined,
		status: input.status,
		assigned_to: input.assigned_to ?? null,
		due_date: input.due_date ?? undefined,
		milestone: input.milestone ?? undefined,
		tags: input.tags,
		is_blocked: input.is_blocked,
		blocked_note: input.blocked_note,
	})
	queryClient.invalidateQueries({ queryKey: qk.stories(project.id) })
	queryClient.invalidateQueries({ queryKey: qk.myTasks() })
	return created
}

export interface BulkTaskItem {
	subject: string
	description?: string
	status?: number
	assigned_to?: number | null
	due_date?: string | null
	milestone?: number | null
	tags?: string[]
	is_blocked?: boolean
	blocked_note?: string
}

export interface BulkAddTasksInput {
	project?: string
	tasks?: BulkTaskItem[]
	subjects?: string[]
}

export interface BulkAddTasksResult {
	project: number
	total: number
	created: UserStory[]
	failed: { index: number; subject: string; error: string }[]
}

export async function bulkAddTasks(input: BulkAddTasksInput): Promise<BulkAddTasksResult> {
	const project = await resolveProject(input.project)
	const items: BulkTaskItem[] =
		input.tasks ?? (input.subjects ?? []).map((s) => ({ subject: s }))
	if (!items.length) throw new Error("No tasks provided")

	const results = await Promise.allSettled(
		items.map((item) =>
			createUserStory({
				project: project.id,
				subject: item.subject.trim(),
				description: item.description?.trim() || undefined,
				status: item.status,
				assigned_to: item.assigned_to ?? null,
				due_date: item.due_date ?? undefined,
				milestone: item.milestone ?? undefined,
				tags: item.tags,
				is_blocked: item.is_blocked,
				blocked_note: item.blocked_note,
			})
		)
	)

	const created: UserStory[] = []
	const failed: { index: number; subject: string; error: string }[] = []
	results.forEach((r, i) => {
		if (r.status === "fulfilled") {
			created.push(r.value)
		} else {
			failed.push({
				index: i,
				subject: items[i].subject,
				error: r.reason instanceof Error ? r.reason.message : String(r.reason),
			})
		}
	})

	queryClient.invalidateQueries({ queryKey: qk.stories(project.id) })
	queryClient.invalidateQueries({ queryKey: qk.myTasks() })

	return { project: project.id, total: items.length, created, failed }
}

export interface DeleteTaskInput {
	project?: string
	id?: number
	ref?: number
}

export interface DeleteTaskResult {
	cancelled?: boolean
	deleted?: boolean
	id?: number
	ref?: number
	subject?: string
	reason?: string
}

export async function deleteTask(input: DeleteTaskInput): Promise<DeleteTaskResult> {
	let story: UserStory
	if (input.id != null) {
		story = await getUserStory(input.id)
	} else if (input.ref != null) {
		const project = await resolveProject(input.project)
		story = await getUserStoryByRef(project.id, input.ref)
	} else {
		throw new Error("Either 'id' or 'ref' is required")
	}

	const confirmed = await confirmDelete(story.ref, story.subject)
	if (!confirmed) {
		return { cancelled: true, id: story.id, ref: story.ref, subject: story.subject }
	}

	await api.delete(`/userstories/${story.id}`)
	const projectId = story.project
	queryClient.invalidateQueries({ queryKey: qk.stories(projectId) })
	queryClient.invalidateQueries({ queryKey: qk.myTasks() })
	return { deleted: true, id: story.id, ref: story.ref, subject: story.subject }
}
