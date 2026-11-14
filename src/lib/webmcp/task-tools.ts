import { createUserStory } from "@/lib/api/userstories"
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
}

export async function addTask(input: AddTaskInput): Promise<UserStory> {
	const project = await resolveProject(input.project)
	const created = await createUserStory({
		project: project.id,
		subject: input.subject.trim(),
		description: input.description?.trim() || undefined,
		status: input.status,
		assigned_to: input.assigned_to ?? null,
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
