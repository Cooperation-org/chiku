<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import { currentProject } from '$lib/stores/project';
	import { getProjects, archiveProject, unarchiveProject, isArchived, createProject, updateProject, deleteProject, reorderProjects } from '$lib/api/projects';
	import { getStatuses, createStatus, deleteStatus } from '$lib/api/statuses';
	import MembersModal from '$lib/components/MembersModal.svelte';
	import type { Project, UserStoryStatus } from '$lib/api/types';

	let projects: Project[] = [];
	let showArchived = false;
	let contextMenuProject: Project | null = null;
	let contextMenuPos = { x: 0, y: 0 };

	// Create project modal state
	let showCreateModal = false;
	let newProjectName = '';
	let newProjectDesc = '';
	let isCreating = false;
	let sourceProjectId: number | null = null;

	// Edit project modal state
	let showEditModal = false;
	let editingProject: Project | null = null;
	let editProjectName = '';
	let editProjectDesc = '';
	let isEditing = false;

	// Delete confirmation state
	let showDeleteConfirm = false;

	// Members modal state
	let showMembersModal = false;
	let deletingProject: Project | null = null;
	let isDeleting = false;

	onMount(() => {
		auth.init();
	});

	// Redirect to login if not authenticated
	$: if (!$auth.isLoading && !$auth.isAuthenticated && !$page.url.pathname.startsWith('/login') && !$page.url.pathname.startsWith('/oauth/') && !$page.url.pathname.startsWith('/auth/')) {
		goto('/login');
	}

	// Load projects when authenticated
	$: if ($auth.isAuthenticated && projects.length === 0) {
		loadProjects();
	}

	// Filter projects based on archive status
	$: activeProjects = projects.filter(p => !isArchived(p));
	$: archivedProjects = projects.filter(p => isArchived(p));
	$: displayedProjects = showArchived ? archivedProjects : activeProjects;

	// Extract project slug and view from URL path: /p/[slug]/board
	$: urlMatch = $page.url.pathname.match(/^\/p\/([^/]+)(\/.*)?$/);
	$: urlSlug = urlMatch ? urlMatch[1] : null;
	$: urlView = urlMatch ? (urlMatch[2] || '/board') : null;

	// When URL has a project slug, select that project
	$: if (urlSlug && projects.length > 0) {
		const match = projects.find(p => p.slug === urlSlug);
		if (match && match.id !== $currentProject?.id) {
			currentProject.set(match);
		}
	}

	async function loadProjects() {
		try {
			const loaded = await getProjects();
			// Server returns in user_order; preserve that
			projects = loaded;
			// Check URL for project slug first, then localStorage, then first active
			const active = projects.filter(p => !isArchived(p));
			const slugParam = $page.url.searchParams.get('project');
			const fromUrl = slugParam ? projects.find(p => p.slug === slugParam) : null;
			const savedId = currentProject.getSavedId();
			const fromSaved = savedId ? projects.find(p => p.id === savedId) : null;
			const pick = fromUrl || fromSaved || (active.length > 0 ? active[0] : null);
			if (pick) {
				currentProject.set(pick);
			}
		} catch (err) {
			console.error('Failed to load projects:', err);
		}
	}

	function selectProject(project: Project) {
		currentProject.set(project);
		// Always go to the board (no query params), clearing any story detail view
		goto(`/p/${project.slug}/board`);
	}

	function handleLogout() {
		auth.logout();
		goto('/login');
	}

	function getInitials(name: string): string {
		return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
	}

	function handleContextMenu(event: MouseEvent, project: Project) {
		event.preventDefault();
		contextMenuProject = project;
		contextMenuPos = { x: event.clientX, y: event.clientY };
	}

	function closeContextMenu() {
		contextMenuProject = null;
	}

	async function toggleArchive(project: Project) {
		const archived = isArchived(project);
		closeContextMenu();

		// Optimistic update - update UI immediately
		const updatedTags = archived
			? (project.tags || []).filter(t => t.toLowerCase() !== 'archived')
			: [...(project.tags || []), 'archived'];

		projects = projects.map(p =>
			p.id === project.id ? { ...p, tags: updatedTags } : p
		);

		// If we archived the current project, switch to another active one and navigate
		if (!archived && $currentProject?.id === project.id) {
			const active = projects.filter(p => !isArchived(p));
			if (active.length > 0) {
				currentProject.set(active[0]);
				goto(`/p/${active[0].slug}/board`);
			} else {
				currentProject.set(null);
				goto('/');
			}
		}
		// If we unarchived a project, select it and navigate to it
		if (archived) {
			currentProject.set({ ...project, tags: updatedTags });
			goto(`/p/${project.slug}/board`);
		}

		// Sync with server in background
		try {
			if (archived) {
				await unarchiveProject(project);
			} else {
				await archiveProject(project);
			}
		} catch (err) {
			// Revert on error
			console.error('Failed to update project:', err);
			projects = await getProjects();
		}
	}

	function openCreateModal() {
		newProjectName = '';
		newProjectDesc = '';
		sourceProjectId = null;
		showCreateModal = true;
	}

	function closeCreateModal() {
		showCreateModal = false;
		newProjectName = '';
		newProjectDesc = '';
		sourceProjectId = null;
	}

	async function handleCreateProject() {
		if (!newProjectName.trim() || isCreating) return;

		isCreating = true;
		const name = newProjectName.trim();
		const description = newProjectDesc.trim();
		const cloneFromProjectId = sourceProjectId;

		// Optimistic: create temp project and close modal immediately
		const tempId = -Date.now();
		const tempProject: Project = {
			id: tempId,
			name,
			description,
			slug: name.toLowerCase().replace(/\s+/g, '-'),
			created_date: new Date().toISOString(),
			modified_date: new Date().toISOString(),
			owner: $auth.user as any,
			members: [],
			is_private: false,
			total_milestones: 0,
			total_story_points: 0,
			is_kanban_activated: true,
			is_backlog_activated: true,
			us_statuses: [],
			task_statuses: [],
			points: [],
			tags: [],
			tags_colors: {}
		};

		projects = [tempProject, ...projects];
		closeCreateModal();
		isCreating = false;

		// Create in background, update with real data
		try {
			const newProject = await createProject({ name, description, is_private: false });

			// Clone columns from source project if selected
			if (cloneFromProjectId) {
				try {
					const sourceStatuses = await getStatuses(cloneFromProjectId);
					const defaultStatusIds = (await getStatuses(newProject.id)).map(s => s.id);

					// Create columns matching source project
					let firstClonedId: number | null = null;
					for (const ss of sourceStatuses.sort((a, b) => a.order - b.order)) {
						const created = await createStatus({
							project: newProject.id,
							name: ss.name,
							color: ss.color,
							is_closed: ss.is_closed,
							order: ss.order
						});
						if (!firstClonedId) firstClonedId = created.id;
					}

					// Remove all default columns, moving any stories to first cloned column
					if (firstClonedId) {
						for (const defId of defaultStatusIds) {
							try {
								await deleteStatus(defId, firstClonedId);
							} catch (e) {
								console.warn('Could not remove default status', defId, e);
							}
						}
					}
				} catch (cloneErr) {
					console.error('Failed to clone columns (project created with defaults):', cloneErr);
				}
			}

			projects = projects.map(p => p.id === tempId ? newProject : p);
			// Now safe to select and navigate
			currentProject.set(newProject);
			goto(`/p/${newProject.slug}/board`);
		} catch (err) {
			console.error('Failed to create project:', err);
			// Remove temp project on error
			projects = projects.filter(p => p.id !== tempId);
			if ($currentProject?.id === tempId) {
				const active = projects.filter(p => !isArchived(p));
				currentProject.set(active.length > 0 ? active[0] : null);
			}
			alert('Failed to create project: ' + (err as Error).message);
		}
	}

	function handleCreateKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && e.metaKey) {
			handleCreateProject();
		} else if (e.key === 'Escape') {
			closeCreateModal();
		}
	}

	// Edit project functions
	function openEditModal(project: Project) {
		editingProject = project;
		editProjectName = project.name;
		editProjectDesc = project.description || '';
		showEditModal = true;
		closeContextMenu();
	}

	function closeEditModal() {
		showEditModal = false;
		editingProject = null;
		editProjectName = '';
		editProjectDesc = '';
	}

	async function handleEditProject() {
		if (!editingProject || !editProjectName.trim() || isEditing) return;

		isEditing = true;
		try {
			const updated = await updateProject(editingProject.id, {
				name: editProjectName.trim(),
				description: editProjectDesc.trim()
			});

			// Update in list
			projects = projects.map(p => p.id === updated.id ? updated : p);

			// Update current project if it's the one being edited
			if ($currentProject?.id === updated.id) {
				currentProject.set(updated);
			}

			closeEditModal();
		} catch (err) {
			console.error('Failed to update project:', err);
			alert('Failed to update project: ' + (err as Error).message);
		} finally {
			isEditing = false;
		}
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && e.metaKey) {
			handleEditProject();
		} else if (e.key === 'Escape') {
			closeEditModal();
		}
	}

	// Delete project functions
	function openDeleteConfirm(project: Project) {
		deletingProject = project;
		showDeleteConfirm = true;
		closeContextMenu();
	}

	function closeDeleteConfirm() {
		showDeleteConfirm = false;
		deletingProject = null;
	}

	async function handleDeleteProject() {
		if (!deletingProject || isDeleting) return;

		isDeleting = true;
		const projectId = deletingProject.id;

		try {
			await deleteProject(projectId);

			// Remove from list
			projects = projects.filter(p => p.id !== projectId);

			// If deleted project was selected, switch to another
			if ($currentProject?.id === projectId) {
				const active = projects.filter(p => !isArchived(p));
				currentProject.set(active.length > 0 ? active[0] : null);
			}

			closeDeleteConfirm();
		} catch (err) {
			console.error('Failed to delete project:', err);
			alert('Failed to delete project: ' + (err as Error).message);
		} finally {
			isDeleting = false;
		}
	}

	// Drag-to-reorder projects
	let dragIndex: number | null = null;
	let dragOverIndex: number | null = null;

	function handleDragStart(e: DragEvent, index: number) {
		dragIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverIndex = index;
	}

	function handleDragEnd() {
		dragIndex = null;
		dragOverIndex = null;
	}

	async function handleDrop(e: DragEvent, dropIndex: number) {
		e.preventDefault();
		if (dragIndex === null || dragIndex === dropIndex) {
			handleDragEnd();
			return;
		}

		// Reorder the displayed list
		const list = [...displayedProjects];
		const [moved] = list.splice(dragIndex, 1);
		list.splice(dropIndex, 0, moved);

		// Update full projects array to reflect new order
		const reordered = list.map((p, i) => ({ ...p, _order: i }));
		const otherProjects = projects.filter(p => !list.some(lp => lp.id === p.id));
		projects = [...reordered, ...otherProjects];

		handleDragEnd();

		// Persist to Taiga
		try {
			await reorderProjects(list.map((p, i) => ({ project_id: p.id, order: i })));
		} catch (err) {
			console.error('Failed to save project order:', err);
		}
	}

	// Check if current route is login or auth callback
	$: isLoginPage = $page.url.pathname.startsWith('/login') || $page.url.pathname.startsWith('/oauth/') || $page.url.pathname.startsWith('/auth/');

	// Helper for project-scoped nav links
	$: projectBase = $currentProject ? `/p/${$currentProject.slug}` : '';
	$: currentView = $page.url.pathname.replace(/^\/p\/[^/]+/, '') || '/board';
	function isView(view: string): boolean {
		return currentView === view || currentView === view + '/';
	}
</script>

<svelte:window on:click={closeContextMenu} on:keydown={showCreateModal ? handleCreateKeydown : showEditModal ? handleEditKeydown : undefined} />

{#if isLoginPage}
	<slot />
{:else if $auth.isLoading}
	<div class="min-h-screen bg-surface-0 flex items-center justify-center">
		<div class="text-zinc-500">Loading...</div>
	</div>
{:else if $auth.isAuthenticated}
	<div class="min-h-screen bg-surface-0 flex">
		<!-- Sidebar -->
		<aside class="w-56 bg-surface-1 border-r border-border flex flex-col">
			<!-- Logo -->
			<div class="p-4 border-b border-border">
				<a href="/" class="flex items-center gap-2">
					<img src="/logo.svg" alt="LinkedTrust" class="w-8 h-8" />
					<span class="font-semibold text-zinc-100">Taiga<span class="text-lt-cyan">LT</span></span>
				</a>
			</div>

			<!-- Projects List -->
			<div class="flex-1 flex flex-col min-h-0 border-b border-border">
				<div class="px-3 py-2 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="text-xs font-medium text-zinc-500 uppercase tracking-wider">Projects</span>
						<button
							on:click={openCreateModal}
							class="w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-surface-3 transition-colors"
							title="New project"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
						</button>
					</div>
					<button
						on:click={() => showArchived = !showArchived}
						class="text-xs px-2 py-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-surface-3 transition-colors"
						title={showArchived ? 'Show active projects' : 'Show archived projects'}
					>
						{showArchived ? 'Archived' : 'Active'} ({showArchived ? archivedProjects.length : activeProjects.length})
					</button>
				</div>
				<div class="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
					{#each displayedProjects as project, i (project.id)}
						<div
							class="group/row flex items-center rounded transition-colors {$currentProject?.id === project.id ? 'bg-surface-3' : 'hover:bg-surface-2'} {dragOverIndex === i && dragIndex !== i ? 'border-t-2 border-lt-cyan' : ''}"
							draggable="true"
							on:dragstart={(e) => handleDragStart(e, i)}
							on:dragover={(e) => handleDragOver(e, i)}
							on:dragend={handleDragEnd}
							on:drop={(e) => handleDrop(e, i)}
						>
							<button
								on:click={() => selectProject(project)}
								on:contextmenu={(e) => handleContextMenu(e, project)}
								class="flex-1 text-left px-2 py-1.5 text-sm truncate {$currentProject?.id === project.id ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}"
								title={project.name}
							>
								{project.name}
							</button>
							<button
								on:click|stopPropagation={() => toggleArchive(project)}
								class="shrink-0 p-1 mr-1 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover/row:opacity-100 transition-opacity"
								title={isArchived(project) ? 'Unarchive' : 'Archive'}
							>
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									{#if isArchived(project)}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4l3 3m0 0l3-3m-3 3V9" />
									{:else}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
									{/if}
								</svg>
							</button>
						</div>
					{/each}
					{#if displayedProjects.length === 0}
						<div class="px-2 py-4 text-sm text-zinc-600 text-center">
							{showArchived ? 'No archived projects' : 'No active projects'}
						</div>
					{/if}
				</div>
			</div>

			<!-- Navigation -->
			<nav class="p-2 space-y-1">
				<a href="/tasks" class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-surface-3 transition-colors" class:bg-surface-3={$page.url.pathname === '/tasks'} class:text-zinc-100={$page.url.pathname === '/tasks'}>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
					</svg>
					My Tasks
				</a>
				<div class="border-t border-border my-1"></div>
				<a href="{projectBase}/board" class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-surface-3 transition-colors" class:bg-surface-3={isView('/board')} class:text-zinc-100={isView('/board')}>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
					</svg>
					Board
				</a>
				<a href="{projectBase}/backlog" class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-surface-3 transition-colors" class:bg-surface-3={isView('/backlog')} class:text-zinc-100={isView('/backlog')}>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
					Backlog
				</a>
				<a href="{projectBase}/epics" class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-surface-3 transition-colors" class:bg-surface-3={isView('/epics')} class:text-zinc-100={isView('/epics')}>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
					Epics
				</a>
				<a href="{projectBase}/velocity" class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-surface-3 transition-colors" class:bg-surface-3={isView('/velocity')} class:text-zinc-100={isView('/velocity')}>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
					Velocity
				</a>
				<button
					on:click={() => showMembersModal = true}
					disabled={!$currentProject}
					class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-surface-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
					</svg>
					Members
				</button>
			</nav>

			<!-- User & Logout -->
			<div class="p-3 border-t border-border">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-8 h-8 rounded-full bg-lt-cyan flex items-center justify-center text-xs font-medium text-zinc-900">
							{$auth.user ? getInitials($auth.user.full_name || $auth.user.username) : '?'}
						</div>
						<span class="text-sm text-zinc-400 truncate">{$auth.user?.username}</span>
					</div>
					<button
						on:click={handleLogout}
						class="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
						title="Logout"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
					</button>
				</div>
			</div>
		</aside>

		<!-- Main content -->
		<main class="flex-1 overflow-hidden">
			<slot />
		</main>

		<!-- Context Menu -->
		{#if contextMenuProject}
			<div
				class="fixed bg-surface-2 border border-border rounded-md shadow-lg py-1 z-50 min-w-[140px]"
				style="left: {contextMenuPos.x}px; top: {contextMenuPos.y}px;"
			>
				<button
					on:click={() => contextMenuProject && openEditModal(contextMenuProject)}
					class="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-surface-3 transition-colors flex items-center gap-2"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
					Edit
				</button>
				<button
					on:click={() => contextMenuProject && toggleArchive(contextMenuProject)}
					class="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-surface-3 transition-colors flex items-center gap-2"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
					</svg>
					{isArchived(contextMenuProject) ? 'Unarchive' : 'Archive'}
				</button>
				<div class="border-t border-border my-1"></div>
				<button
					on:click={() => contextMenuProject && openDeleteConfirm(contextMenuProject)}
					class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-surface-3 transition-colors flex items-center gap-2"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
					Delete
				</button>
			</div>
		{/if}

		<!-- Create Project Modal -->
		{#if showCreateModal}
			<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" on:click={closeCreateModal}>
				<div
					class="bg-surface-1 border border-border rounded-lg shadow-xl w-full max-w-md mx-4"
					on:click|stopPropagation
				>
					<div class="p-4 border-b border-border">
						<h2 class="text-lg font-semibold text-zinc-100">New Project</h2>
					</div>
					<div class="p-4 space-y-4">
						<div>
							<label for="project-name" class="block text-sm font-medium text-zinc-400 mb-1">Name</label>
							<input
								id="project-name"
								type="text"
								bind:value={newProjectName}
								placeholder="Project name"
								class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent"
								autofocus
							/>
						</div>
						<div>
							<label for="project-desc" class="block text-sm font-medium text-zinc-400 mb-1">Description</label>
							<textarea
								id="project-desc"
								bind:value={newProjectDesc}
								placeholder="Brief description (optional)"
								rows="3"
								class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent resize-none"
							></textarea>
						</div>
						<div>
							<label for="source-project" class="block text-sm font-medium text-zinc-400 mb-1">Copy columns from</label>
							<select
								id="source-project"
								bind:value={sourceProjectId}
								class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent"
							>
								<option value={null}>Default columns</option>
								{#each activeProjects as p}
									<option value={p.id}>{p.name}</option>
								{/each}
							</select>
						</div>
					</div>
					<div class="p-4 border-t border-border flex justify-end gap-2">
						<button
							on:click={closeCreateModal}
							class="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
						>
							Cancel
						</button>
						<button
							on:click={handleCreateProject}
							disabled={!newProjectName.trim() || isCreating}
							class="px-4 py-2 text-sm bg-lt-cyan text-zinc-900 font-medium rounded-md hover:bg-lt-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isCreating ? 'Creating...' : 'Create'}
						</button>
					</div>
					<div class="px-4 pb-3">
						<p class="text-xs text-zinc-600 text-center">Press <kbd class="px-1 py-0.5 bg-surface-2 rounded text-zinc-500">Cmd+Enter</kbd> to create</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Edit Project Modal -->
		{#if showEditModal && editingProject}
			<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" on:click={closeEditModal}>
				<div
					class="bg-surface-1 border border-border rounded-lg shadow-xl w-full max-w-md mx-4"
					on:click|stopPropagation
				>
					<div class="p-4 border-b border-border">
						<h2 class="text-lg font-semibold text-zinc-100">Edit Project</h2>
					</div>
					<div class="p-4 space-y-4">
						<div>
							<label for="edit-project-name" class="block text-sm font-medium text-zinc-400 mb-1">Name</label>
							<input
								id="edit-project-name"
								type="text"
								bind:value={editProjectName}
								placeholder="Project name"
								class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent"
								autofocus
							/>
						</div>
						<div>
							<label for="edit-project-desc" class="block text-sm font-medium text-zinc-400 mb-1">Description</label>
							<textarea
								id="edit-project-desc"
								bind:value={editProjectDesc}
								placeholder="Brief description (optional)"
								rows="3"
								class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent resize-none"
							></textarea>
						</div>
					</div>
					<div class="p-4 border-t border-border flex justify-end gap-2">
						<button
							on:click={closeEditModal}
							class="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
						>
							Cancel
						</button>
						<button
							on:click={handleEditProject}
							disabled={!editProjectName.trim() || isEditing}
							class="px-4 py-2 text-sm bg-lt-cyan text-zinc-900 font-medium rounded-md hover:bg-lt-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isEditing ? 'Saving...' : 'Save'}
						</button>
					</div>
					<div class="px-4 pb-3">
						<p class="text-xs text-zinc-600 text-center">Press <kbd class="px-1 py-0.5 bg-surface-2 rounded text-zinc-500">Cmd+Enter</kbd> to save</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Delete Confirmation Modal -->
		{#if showDeleteConfirm && deletingProject}
			<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" on:click={closeDeleteConfirm}>
				<div
					class="bg-surface-1 border border-border rounded-lg shadow-xl w-full max-w-sm mx-4"
					on:click|stopPropagation
				>
					<div class="p-4 border-b border-border">
						<h2 class="text-lg font-semibold text-zinc-100">Delete Project</h2>
					</div>
					<div class="p-4">
						<p class="text-zinc-300">
							Are you sure you want to delete <strong class="text-zinc-100">{deletingProject.name}</strong>?
						</p>
						<p class="text-sm text-zinc-500 mt-2">This action cannot be undone. All issues in this project will be permanently deleted.</p>
					</div>
					<div class="p-4 border-t border-border flex justify-end gap-2">
						<button
							on:click={closeDeleteConfirm}
							class="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
						>
							Cancel
						</button>
						<button
							on:click={handleDeleteProject}
							disabled={isDeleting}
							class="px-4 py-2 text-sm bg-red-600 text-white font-medium rounded-md hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Members Modal -->
		{#if showMembersModal && $currentProject}
			<MembersModal
				projectId={$currentProject.id}
				projectName={$currentProject.name}
				on:close={() => showMembersModal = false}
			/>
		{/if}
	</div>
{/if}
