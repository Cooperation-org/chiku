<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import { currentProject } from '$lib/stores/project';
	import { getProjects, archiveProject, unarchiveProject, isArchived, createProject, updateProject, deleteProject } from '$lib/api/projects';
	import MembersModal from '$lib/components/MembersModal.svelte';
	import type { Project } from '$lib/api/types';

	let projects: Project[] = [];
	let showArchived = false;
	let contextMenuProject: Project | null = null;
	let contextMenuPos = { x: 0, y: 0 };

	// Create project modal state
	let showCreateModal = false;
	let newProjectName = '';
	let newProjectDesc = '';
	let isCreating = false;

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

	// Theme state
	let isDark = true;

	onMount(() => {
		auth.init();
		// Initialize theme from localStorage
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			isDark = savedTheme === 'dark';
		} else {
			// Default to dark if no preference saved
			isDark = true;
		}
		applyTheme();
	});

	function applyTheme() {
		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	function toggleTheme() {
		isDark = !isDark;
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
		applyTheme();
	}

	// Redirect to login if not authenticated
	$: if (!$auth.isLoading && !$auth.isAuthenticated && !$page.url.pathname.startsWith('/login')) {
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

	async function loadProjects() {
		try {
			const loaded = await getProjects();
			// Sort by most recently modified
			projects = loaded.sort((a, b) =>
				new Date(b.modified_date).getTime() - new Date(a.modified_date).getTime()
			);
			// Restore saved project or auto-select first active
			const active = projects.filter(p => !isArchived(p));
			if (!$currentProject) {
				const savedId = currentProject.getSavedId();
				const saved = savedId ? projects.find(p => p.id === savedId) : null;
				if (saved) {
					currentProject.set(saved);
				} else if (active.length > 0) {
					currentProject.set(active[0]);
				}
			}
		} catch (err) {
			console.error('Failed to load projects:', err);
		}
	}

	function selectProject(project: Project) {
		currentProject.set(project);
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

		// If we archived the current project, switch to another active one
		if (!archived && $currentProject?.id === project.id) {
			const active = projects.filter(p => !isArchived(p));
			if (active.length > 0) {
				currentProject.set(active[0]);
			}
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
		showCreateModal = true;
	}

	function closeCreateModal() {
		showCreateModal = false;
		newProjectName = '';
		newProjectDesc = '';
	}

	async function handleCreateProject() {
		if (!newProjectName.trim() || isCreating) return;

		isCreating = true;
		const name = newProjectName.trim();
		const description = newProjectDesc.trim();

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
			projects = projects.map(p => p.id === tempId ? newProject : p);
			// Now safe to select and navigate
			currentProject.set(newProject);
			goto('/board');
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

	// Check if current route is login
	$: isLoginPage = $page.url.pathname.startsWith('/login');

	// Force reactivity on page changes for nav highlighting
	$: currentPath = $page.url.pathname;

	// Helper function for dynamic nav link classes
	function navLinkClass(isActive: boolean): string {
		const base = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150';
		if (isActive) {
			return `${base} bg-[var(--bg-active)] text-[var(--accent)]`;
		}
		return `${base} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]`;
	}

	function projectBtnClass(project: Project): string {
		const base = 'w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-all duration-150';
		const isSelected = $currentProject?.id === project.id;
		if (isSelected) {
			return `${base} bg-[var(--bg-active)] text-[var(--accent)] font-medium`;
		}
		return `${base} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]`;
	}
</script>

<svelte:window on:click={closeContextMenu} on:keydown={showCreateModal ? handleCreateKeydown : showEditModal ? handleEditKeydown : undefined} />

{#if isLoginPage}
	<slot />
{:else if $auth.isLoading}
	<div class="min-h-screen flex items-center justify-center" style="background-color: var(--bg-app);">
		<div style="color: var(--text-muted);">Loading...</div>
	</div>
{:else if $auth.isAuthenticated}
	<div class="min-h-screen flex" style="background-color: var(--bg-app);">
		<!-- Sidebar -->
		<aside class="w-56 flex flex-col border-r" style="background-color: var(--bg-sidebar); border-color: var(--border-default);">
			<!-- Logo -->
			<div class="p-4 border-b" style="border-color: var(--border-default);">
				<a href="/" class="flex items-center gap-2">
					<img src="/logo.svg" alt="LinkedTrust" class="w-8 h-8" />
					<span class="font-semibold" style="color: var(--text-primary);">Taiga<span style="color: var(--accent);">LT</span></span>
				</a>
			</div>

			<!-- Projects List -->
			<div class="flex-1 flex flex-col min-h-0 border-b" style="border-color: var(--border-default);">
				<div class="px-3 py-3 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="text-[11px] font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Projects</span>
						<button
							on:click={openCreateModal}
							class="w-5 h-5 flex items-center justify-center rounded-md transition-colors"
							style="color: var(--text-muted);"
							title="New project"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
						</button>
					</div>
					<button
						on:click={() => showArchived = !showArchived}
						class="text-[11px] px-2 py-1 rounded-md font-medium transition-colors"
						style="color: var(--text-muted);"
						title={showArchived ? 'Show active projects' : 'Show archived projects'}
					>
						{showArchived ? 'Archived' : 'Active'} ({showArchived ? archivedProjects.length : activeProjects.length})
					</button>
				</div>
				<div class="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
					{#each displayedProjects as project (project.id)}
						<button
							on:click={() => selectProject(project)}
							on:contextmenu={(e) => handleContextMenu(e, project)}
							class={projectBtnClass(project)}
							title="{project.name} (right-click for options)"
						>
							{project.name}
						</button>
					{/each}
					{#if displayedProjects.length === 0}
						<div class="px-3 py-6 text-sm text-center" style="color: var(--text-muted);">
							{showArchived ? 'No archived projects' : 'No active projects'}
						</div>
					{/if}
				</div>
			</div>

			<!-- Navigation -->
			<nav class="p-3 space-y-1">
				<a href="/board" class={navLinkClass(currentPath === '/board')}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
					</svg>
					Board
				</a>
				<a href="/backlog" class={navLinkClass(currentPath === '/backlog')}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
					Backlog
				</a>
				<a href="/epics" class={navLinkClass(currentPath === '/epics')}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
					Epics
				</a>
				<a href="/velocity" class={navLinkClass(currentPath === '/velocity')}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
					Velocity
				</a>
				<button
					on:click={() => showMembersModal = true}
					disabled={!$currentProject}
					class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
					style="color: var(--text-secondary);"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
					</svg>
					Members
				</button>
			</nav>

			<!-- User & Logout -->
			<div class="p-3 border-t" style="border-color: var(--border-default);">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white" style="background-color: var(--accent);">
							{$auth.user ? getInitials($auth.user.full_name || $auth.user.username) : '?'}
						</div>
						<span class="text-sm truncate" style="color: var(--text-secondary);">{$auth.user?.username}</span>
					</div>
					<button
						on:click={handleLogout}
						class="p-1.5 transition-colors rounded-md"
						style="color: var(--text-muted);"
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
				class="fixed rounded-md shadow-lg py-1 z-50 min-w-[140px]"
				style="background-color: var(--bg-card); border: 1px solid var(--border-default); left: {contextMenuPos.x}px; top: {contextMenuPos.y}px;"
			>
				<button
					on:click={() => contextMenuProject && openEditModal(contextMenuProject)}
					class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
					style="color: var(--text-secondary);"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
					Edit
				</button>
				<button
					on:click={() => contextMenuProject && toggleArchive(contextMenuProject)}
					class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
					style="color: var(--text-secondary);"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
					</svg>
					{isArchived(contextMenuProject) ? 'Unarchive' : 'Archive'}
				</button>
				<div class="my-1 border-t" style="border-color: var(--border-default);"></div>
				<button
					on:click={() => contextMenuProject && openDeleteConfirm(contextMenuProject)}
					class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
					style="color: #ef4444;"
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
			<div class="fixed inset-0 flex items-center justify-center z-50 modal-backdrop" on:click={closeCreateModal}>
				<div class="rounded-lg shadow-xl w-full max-w-md mx-4 modal-content" on:click|stopPropagation>
					<div class="p-4 border-b" style="border-color: var(--border-default);">
						<h2 class="text-lg font-semibold" style="color: var(--text-primary);">New Project</h2>
					</div>
					<div class="p-4 space-y-4">
						<div>
							<label for="project-name" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Name</label>
							<input
								id="project-name"
								type="text"
								bind:value={newProjectName}
								placeholder="Project name"
								class="w-full px-3 py-2 rounded-md"
								style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
								autofocus
							/>
						</div>
						<div>
							<label for="project-desc" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Description</label>
							<textarea
								id="project-desc"
								bind:value={newProjectDesc}
								placeholder="Brief description (optional)"
								rows="3"
								class="w-full px-3 py-2 rounded-md resize-none"
								style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
							></textarea>
						</div>
					</div>
					<div class="p-4 border-t flex justify-end gap-2" style="border-color: var(--border-default);">
						<button
							on:click={closeCreateModal}
							class="px-4 py-2 text-sm transition-colors"
							style="color: var(--text-secondary);"
						>
							Cancel
						</button>
						<button
							on:click={handleCreateProject}
							disabled={!newProjectName.trim() || isCreating}
							class="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-primary"
						>
							{isCreating ? 'Creating...' : 'Create'}
						</button>
					</div>
					<div class="px-4 pb-3">
						<p class="text-xs text-center" style="color: var(--text-muted);">Press <kbd class="px-1 py-0.5 rounded" style="background-color: var(--bg-hover); color: var(--text-muted);">Cmd+Enter</kbd> to create</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Edit Project Modal -->
		{#if showEditModal && editingProject}
			<div class="fixed inset-0 flex items-center justify-center z-50 modal-backdrop" on:click={closeEditModal}>
				<div class="rounded-lg shadow-xl w-full max-w-md mx-4 modal-content" on:click|stopPropagation>
					<div class="p-4 border-b" style="border-color: var(--border-default);">
						<h2 class="text-lg font-semibold" style="color: var(--text-primary);">Edit Project</h2>
					</div>
					<div class="p-4 space-y-4">
						<div>
							<label for="edit-project-name" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Name</label>
							<input
								id="edit-project-name"
								type="text"
								bind:value={editProjectName}
								placeholder="Project name"
								class="w-full px-3 py-2 rounded-md"
								style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
								autofocus
							/>
						</div>
						<div>
							<label for="edit-project-desc" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Description</label>
							<textarea
								id="edit-project-desc"
								bind:value={editProjectDesc}
								placeholder="Brief description (optional)"
								rows="3"
								class="w-full px-3 py-2 rounded-md resize-none"
								style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
							></textarea>
						</div>
					</div>
					<div class="p-4 border-t flex justify-end gap-2" style="border-color: var(--border-default);">
						<button
							on:click={closeEditModal}
							class="px-4 py-2 text-sm transition-colors"
							style="color: var(--text-secondary);"
						>
							Cancel
						</button>
						<button
							on:click={handleEditProject}
							disabled={!editProjectName.trim() || isEditing}
							class="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-primary"
						>
							{isEditing ? 'Saving...' : 'Save'}
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Delete Confirmation Modal -->
		{#if showDeleteConfirm && deletingProject}
			<div class="fixed inset-0 flex items-center justify-center z-50 modal-backdrop" on:click={closeDeleteConfirm}>
				<div class="rounded-lg shadow-xl w-full max-w-sm mx-4 modal-content" on:click|stopPropagation>
					<div class="p-4 border-b" style="border-color: var(--border-default);">
						<h2 class="text-lg font-semibold" style="color: var(--text-primary);">Delete Project</h2>
					</div>
					<div class="p-4">
						<p style="color: var(--text-secondary);">
							Are you sure you want to delete <strong style="color: var(--text-primary);">{deletingProject.name}</strong>?
						</p>
						<p class="text-sm mt-2" style="color: var(--text-muted);">This action cannot be undone. All issues in this project will be permanently deleted.</p>
					</div>
					<div class="p-4 border-t flex justify-end gap-2" style="border-color: var(--border-default);">
						<button
							on:click={closeDeleteConfirm}
							class="px-4 py-2 text-sm transition-colors"
							style="color: var(--text-secondary);"
						>
							Cancel
						</button>
						<button
							on:click={handleDeleteProject}
							disabled={isDeleting}
							class="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							style="background-color: #ef4444; color: white;"
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