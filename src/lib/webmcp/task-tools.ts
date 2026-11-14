import { createUserStory, getUserStory, getUserStoryByRef } from "@/lib/api/userstories"
import { getProject, getProjectBySlug, getProjects } from "@/lib/api/projects"
import { api } from "@/lib/api/client"
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

	const confirmed = window.confirm(
		`Delete task #${story.ref}: "${story.subject}"?\\n\\nThis action cannot be undone.`
	)
	if (!confirmed) {
		return { cancelled: true, id: story.id, ref: story.ref, subject: story.subject }
	}

	await api.delete(`/userstories/${story.id}`)
	const projectId = story.project
	queryClient.invalidateQueries({ queryKey: qk.stories(projectId) })
	queryClient.invalidateQueries({ queryKey: qk.myTasks() })
	return { deleted: true, id: story.id, ref: story.ref, subject: story.subject }
}