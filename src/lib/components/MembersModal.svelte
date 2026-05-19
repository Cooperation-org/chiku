<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { getProjectMemberships, getProjectRoles, getAllUsers, addMembership, removeMembership, createInvitation, updateMembershipRole } from '$lib/api/memberships';
	import type { Membership, Role } from '$lib/api/memberships';
	import { getRoleDefaultsConfig } from '$lib/config/roleDefaults';

	export let projectId: number;
	export let projectName: string = '';

	const dispatch = createEventDispatcher<{ close: void }>();

	let memberships: Membership[] = [];
	let roles: Role[] = [];
	let allUsers: { id: number; username: string; full_name: string }[] = [];
	let isLoading = true;
	let isLoadingUsers = false;
	let usersLoaded = false;
	let error = '';

	// Active tab: 'search' | 'invite'
	let activeTab: 'search' | 'invite' = 'search';

	// Add member state (user search)
	let searchQuery = '';
	let selectedUser: { id: number; username: string; full_name: string } | null = null;
	let selectedRole: number | null = null;
	let isAdding = false;

	// Invite by username state
	let inviteUsername = '';
	let inviteRole: number | null = null;
	let isInviting = false;
	let inviteError = '';

	// Role change state
	let editingRoleFor: number | null = null;
	let newRoleFor: number | null = null;

	$: memberUserIds = new Set(memberships.map(m => m.user));
	$: availableUsers = allUsers.filter(u => !memberUserIds.has(u.id));
	$: filteredUsers = searchQuery.length >= 2
		? availableUsers.filter(u =>
			u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
		).slice(0, 10)
		: [];

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		isLoading = true;
		error = '';
		try {
			[memberships, roles] = await Promise.all([
				getProjectMemberships(projectId),
				getProjectRoles(projectId)
			]);
			const config = getRoleDefaultsConfig();
			roles = roles.sort((a, b) => a.order - b.order);
			if (roles.length > 0 && !selectedRole) {
				selectedRole = roles.find(r =>
					config.preferredRoleNames.length === 0 ||
					config.preferredRoleNames.some(preferred =>
						r.name.toLowerCase() === preferred.toLowerCase()
					)
				)?.id ?? roles[0].id;
			}
			if (roles.length > 0 && !inviteRole) {
				inviteRole = roles.find(r =>
					config.preferredRoleNames.length === 0 ||
					config.preferredRoleNames.some(preferred =>
						r.name.toLowerCase() === preferred.toLowerCase()
					)
				)?.id ?? roles[0].id;
			}
		} catch (err) {
			error = (err as Error).message;
		} finally {
			isLoading = false;
		}
	}

	async function loadUsersIfNeeded() {
		if (usersLoaded || isLoadingUsers) return;
		isLoadingUsers = true;
		try {
			allUsers = await getAllUsers();
			usersLoaded = true;
		} catch (err) {
			console.error('Failed to load users:', err);
		} finally {
			isLoadingUsers = false;
		}
	}

	$: if (searchQuery.length >= 2 && !usersLoaded) {
		loadUsersIfNeeded();
	}

	function selectUser(user: { id: number; username: string; full_name: string }) {
		selectedUser = user;
		searchQuery = '';
	}

	async function handleAddMember() {
		if (!selectedUser || !selectedRole || isAdding) return;

		isAdding = true;
		try {
			const newMembership = await addMembership(projectId, selectedUser.username, selectedRole);
			memberships = [...memberships, newMembership];
			selectedUser = null;
		} catch (err) {
			alert('Failed to add member: ' + (err as Error).message);
		} finally {
			isAdding = false;
		}
	}

	async function handleInviteByUsername() {
		if (!inviteUsername.trim() || !inviteRole || isInviting) return;

		isInviting = true;
		inviteError = '';
		try {
			const newMembership = await createInvitation(projectId, inviteUsername.trim(), inviteRole);
			memberships = [...memberships, newMembership];
			inviteUsername = '';
		} catch (err) {
			inviteError = err instanceof Error ? err.message : 'Failed to send invitation';
		} finally {
			isInviting = false;
		}
	}

	async function handleRemoveMember(membership: Membership) {
		if (!confirm(`Remove ${membership.full_name} from this project?`)) return;

		const original = memberships;
		memberships = memberships.filter(m => m.id !== membership.id);

		try {
			await removeMembership(membership.id);
		} catch (err) {
			alert('Failed to remove member: ' + (err as Error).message);
			memberships = original;
		}
	}

	function startEditRole(membership: Membership) {
		editingRoleFor = membership.id;
		const config = getRoleDefaultsConfig();
		newRoleFor = roles.find(r =>
			r.name.toLowerCase() === membership.role_name.toLowerCase()
		)?.id ?? roles.find(r =>
			config.preferredRoleNames.length > 0 &&
			config.preferredRoleNames.some(preferred =>
				r.name.toLowerCase() === preferred.toLowerCase()
			)
		)?.id ?? roles[0]?.id ?? null;
	}

	async function saveRoleChange(membership: Membership) {
		if (!newRoleFor || newRoleFor === roles.find(r => r.name === membership.role_name)?.id) {
			editingRoleFor = null;
			return;
		}

		const idx = memberships.findIndex(m => m.id === membership.id);
		if (idx === -1) return;

		const original = memberships;
		try {
			const updated = await updateMembershipRole(membership.id, newRoleFor, idx);
			memberships = memberships.map(m => m.id === membership.id ? { ...m, role: updated.role, role_name: updated.role_name } : m);
			editingRoleFor = null;
		} catch (err) {
			alert('Failed to update role: ' + (err as Error).message);
			memberships = original;
		}
	}

	function cancelEditRole() {
		editingRoleFor = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			dispatch('close');
		}
	}

	function getInitials(name: string | null | undefined): string {
		if (!name) return '?';
		return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fixed inset-0 flex items-center justify-center z-50 p-4 modal-backdrop" on:click={() => dispatch('close')}>
	<div
		class="rounded-lg shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col modal-content"
		on:click|stopPropagation
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-4 shrink-0" style="border-bottom: 1px solid var(--border-default);">
			<div>
				<h2 class="text-lg font-semibold" style="color: var(--text-primary);">Project Members</h2>
				<p class="text-sm" style="color: var(--text-muted);">{projectName}</p>
			</div>
			<button
				on:click={() => dispatch('close')}
				class="p-2 rounded transition-colors"
				style="color: var(--text-muted);"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Tabs -->
		<div class="flex shrink-0" style="border-bottom: 1px solid var(--border-default);">
			<button
				class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
				style={activeTab === 'search' ? `color: var(--accent); border-color: var(--accent);` : `color: var(--text-muted); border-color: transparent;`}
				on:click={() => activeTab = 'search'}
			>
				Add Existing User
			</button>
			<button
				class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
				style={activeTab === 'invite' ? `color: var(--accent); border-color: var(--accent);` : `color: var(--text-muted); border-color: transparent;`}
				on:click={() => activeTab = 'invite'}
			>
				Invite by Username
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto">
			{#if activeTab === 'search'}
				<!-- Search/add existing user -->
				<div class="p-4">
					<div class="text-sm font-medium mb-3" style="color: var(--text-muted);">Current Members ({memberships.length})</div>
					{#if isLoading}
						<div class="text-center py-4" style="color: var(--text-muted);">Loading...</div>
					{:else if error}
						<div class="text-center py-4" style="color: #ef4444;">{error}</div>
					{:else if memberships.length === 0}
						<div class="text-center py-4" style="color: var(--text-muted);">No members yet</div>
					{:else}
						<div class="space-y-2">
							{#each memberships as member (member.id)}
								<div class="flex items-center gap-3 p-2 rounded-md group" style="background-color: var(--bg-hover);">
									<div
										class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
										style="background-color: {member.color || 'var(--accent)'}"
									>
										{getInitials(member.full_name)}
									</div>
									<div class="flex-1 min-w-0">
										<div class="text-sm truncate" style="color: var(--text-primary);">{member.full_name}</div>
										{#if editingRoleFor === member.id}
											<select
												bind:value={newRoleFor}
												class="mt-1 text-xs px-2 py-1 rounded"
												style="background-color: var(--bg-active); border: 1px solid var(--border-default); color: var(--text-primary);"
											>
												{#each roles as role}
													<option value={role.id}>{role.name}</option>
												{/each}
											</select>
										{:else}
											<div class="text-xs" style="color: var(--text-muted);">{member.role_name}</div>
										{/if}
									</div>
									<div class="flex items-center gap-1 shrink-0">
										{#if editingRoleFor === member.id}
											<button
												class="p-1 transition-colors"
												style="color: #22c55e;"
												on:click={() => saveRoleChange(member)}
												title="Save role"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
												</svg>
											</button>
											<button
												class="p-1 transition-colors"
												style="color: var(--text-muted);"
												on:click={cancelEditRole}
												title="Cancel"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										{:else}
											{#if !member.is_owner}
												<button
													class="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
													style="color: var(--text-muted);"
													title="Change role"
													on:click={() => startEditRole(member)}
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
													</svg>
												</button>
												<button
													class="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
													style="color: var(--text-muted);"
													title="Remove member"
													on:click={() => handleRemoveMember(member)}
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
												</button>
											{/if}
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Add section -->
					<div class="mt-4 space-y-3">
						<div class="text-sm font-medium" style="color: var(--text-muted);">Add to project</div>
						{#if selectedUser}
							<div class="flex items-center gap-2">
								<div class="flex-1 flex items-center gap-2 px-3 py-2 rounded-md" style="background-color: var(--bg-hover); border: 1px solid var(--border-default);">
									<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium" style="background-color: rgb(0 178 229 / 0.2); color: var(--accent);">
										{getInitials(selectedUser.full_name || selectedUser.username)}
									</div>
									<span class="text-sm" style="color: var(--text-primary);">{selectedUser.full_name || selectedUser.username}</span>
									<button on:click={() => selectedUser = null} class="ml-auto" style="color: var(--text-muted);">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
								<select
									bind:value={selectedRole}
									class="px-2 py-2 rounded-md text-sm"
									style="background-color: var(--bg-hover); border: 1px solid var(--border-default); color: var(--text-primary);"
								>
									{#each roles as role}
										<option value={role.id}>{role.name}</option>
									{/each}
								</select>
								<button
									on:click={handleAddMember}
									disabled={isAdding}
									class="px-3 py-2 font-medium rounded-md text-sm transition-colors disabled:opacity-50 btn-primary"
								>
									{isAdding ? '...' : 'Add'}
								</button>
							</div>
						{:else}
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Type 2+ chars to search users..."
								class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								style="background-color: var(--bg-hover); border: 1px solid var(--border-default); color: var(--text-primary);"
							/>
							{#if isLoadingUsers}
								<p class="text-sm" style="color: var(--text-muted);">Loading users...</p>
							{:else if filteredUsers.length > 0}
								<div class="max-h-48 overflow-y-auto rounded-md" style="border: 1px solid var(--border-default);">
									{#each filteredUsers as user}
										<button
											on:click={() => selectUser(user)}
											class="w-full text-left px-3 py-2 transition-colors flex items-center gap-2"
											style="border-bottom: 1px solid var(--border-default);"
										>
											<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium" style="background-color: rgb(0 178 229 / 0.2); color: var(--accent);">
												{getInitials(user.full_name || user.username)}
											</div>
											<div class="flex-1 min-w-0">
												<div class="text-sm truncate" style="color: var(--text-primary);">{user.full_name || user.username}</div>
												<div class="text-xs" style="color: var(--text-muted);">@{user.username}</div>
											</div>
											<span class="text-xs" style="color: var(--text-muted);">Click to add</span>
										</button>
									{/each}
								</div>
							{:else if searchQuery.length >= 2 && usersLoaded}
								<p class="text-sm mt-2" style="color: var(--text-muted);">No users found matching "{searchQuery}"</p>
							{:else if searchQuery.length > 0 && searchQuery.length < 2}
								<p class="text-sm mt-2" style="color: var(--text-muted);">Type at least 2 characters to search</p>
							{/if}
						{/if}
					</div>
				</div>
			{:else}
				<!-- Invite by username -->
				<div class="p-4 space-y-4">
					<div class="text-sm" style="color: var(--text-muted);">
						Enter the username of a person who already has a Taiga account. They will be added to the project with the selected role — no email required.
					</div>

					<div>
						<label for="invite-username" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">
							Username
						</label>
						<input
							id="invite-username"
							type="text"
							bind:value={inviteUsername}
							placeholder="their-username"
							class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							style="background-color: var(--bg-hover); border: 1px solid var(--border-default); color: var(--text-primary);"
						/>
					</div>

					<div>
						<label for="invite-role" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">
							Role
						</label>
						<select
							id="invite-role"
							bind:value={inviteRole}
							class="w-full px-3 py-2 rounded-md"
							style="background-color: var(--bg-hover); border: 1px solid var(--border-default); color: var(--text-primary);"
						>
							{#each roles as role}
								<option value={role.id}>{role.name}</option>
							{/each}
						</select>
					</div>

					{#if inviteError}
						<div class="p-3 rounded-md text-sm" style="background-color: rgb(239 68 68 / 0.1); border: 1px solid rgb(239 68 68 / 0.2); color: #ef4444;">
							{inviteError}
						</div>
					{/if}

					<button
						on:click={handleInviteByUsername}
						disabled={!inviteUsername.trim() || !inviteRole || isInviting}
						class="w-full py-2 px-4 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-primary"
					>
						{isInviting ? 'Adding...' : 'Add to Project'}
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>