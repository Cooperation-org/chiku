import { useEffect, useState } from "react"
import { useWebMCP } from "usewebmcp"
import { useAuth } from "@/lib/stores/auth"
import { addTask, bulkAddTasks, deleteTask } from "@/lib/webmcp/task-tools"

export function WebMcpTools() {
	const isAuthenticated = useAuth((s) => s.isAuthenticated)
	// Support is evaluated at runtime (the polyfill installs after module load),
	// so we track it in state instead of capturing it once at import time.
	const [supported, setSupported] = useState(
		typeof document !== "undefined" && !!document.modelContext
	)
	useEffect(() => {
		if (supported) return
		const check = () => {
			if (document.modelContext) {
				setSupported(true)
				return true
			}
			return false
		}
		if (check()) return
		const id = window.setInterval(check, 250)
		const timeout = window.setTimeout(() => window.clearInterval(id), 5000)
		return () => {
			window.clearInterval(id)
			window.clearTimeout(timeout)
		}
	}, [supported])

	// Hello-world / health-check tool — always registered when supported.
	useWebMCP(
		{
			enabled: supported,
			name: "hello_chiku",
			description: "Health check: returns a greeting from chiku.",
			inputSchema: { type: "object", properties: {} },
			execute: async () => ({ message: "Hello from chiku!" }),
		},
		undefined
	)

	useWebMCP(
		{
			enabled: supported && isAuthenticated,
			name: "add_task",
			description: "Create a single task (user story) in a chiku project.",
			inputSchema: {
				type: "object",
				properties: {
					project: {
						type: "string",
						description: "Project id or slug. Defaults to the currently selected project.",
					},
					subject: { type: "string", description: "Task title" },
					description: { type: "string" },
					status: { type: "number", description: "Status id" },
					assigned_to: { type: "number", description: "Assignee user id" },
				},
				required: ["subject"],
			},
			execute: async (args) => {
				if (!isAuthenticated) throw new Error("Not authenticated")
				const created = await addTask(args as any)
				return { content: [{ type: "text", text: JSON.stringify(created) }] }
			},
		},
		undefined
	)

	useWebMCP(
		{
			enabled: supported && isAuthenticated,
			name: "bulk_add_tasks",
			description:
				"Create multiple tasks in one project. Pass `tasks` (array of {subject,...}) or a shorthand `subjects` string array.",
			inputSchema: {
				type: "object",
				properties: {
					project: { type: "string" },
					tasks: {
						type: "array",
						items: {
							type: "object",
							properties: {
								subject: { type: "string" },
								description: { type: "string" },
								status: { type: "number" },
								assigned_to: { type: "number" },
							},
							required: ["subject"],
						},
					},
					subjects: { type: "array", items: { type: "string" } },
				},
			},
			execute: async (args) => {
				if (!isAuthenticated) throw new Error("Not authenticated")
				const result = await bulkAddTasks(args as any)
				return { content: [{ type: "text", text: JSON.stringify(result) }] }
			},
		},
		undefined
	)

	useWebMCP(
		{
			enabled: supported && isAuthenticated,
			name: "delete_task",
			description:
				"Delete a task (user story) by id or ref. Asks the user for confirmation before deleting; returns cancelled if declined.",
			annotations: {
				readOnlyHint: false,
				consequentialHint: true,
			},
			inputSchema: {
				type: "object",
				properties: {
					project: {
						type: "string",
						description: "Project id or slug (used to resolve 'ref'). Defaults to the currently selected project.",
					},
					id: { type: "number", description: "Task id" },
					ref: { type: "number", description: "Task human ref (requires project)" },
				},
			},
			execute: async (args) => {
				if (!isAuthenticated) throw new Error("Not authenticated")
				const result = await deleteTask(args as any)
				return { content: [{ type: "text", text: JSON.stringify(result) }] }
			},
		},
		undefined
	)

	return null
}
