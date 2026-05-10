<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { getProjectMemberships, getProjectRoles, getAllUsers, addMembership, removeMembership, createInvitation, updateMembershipRole } from '$lib/api/memberships';
	import type { Membership, Role } from '$lib/api/memberships';

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
			roles = roles.sort((a, b) => a.order - b.order);
			if (roles.length > 0 && !selectedRole) {
				selectedRole = roles[0].id;
			}
			if (roles.length > 0 && !inviteRole) {
				inviteRole = roles[0].id;
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
		newRoleFor = roles.find(r => r.name === membership.role_name)?.id ?? roles[0]?.id ?? null;
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

<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" on:click={() => dispatch('close')}>
	<div
		class="bg-surface-1 border border-border rounded-lg shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
		on:click|stopPropagation
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-border shrink-0">
			<div>
				<h2 class="text-lg font-semibold text-zinc-100">Project Members</h2>
				<p class="text-sm text-zinc-500">{projectName}</p>
			</div>
			<button
				on:click={() => dispatch('close')}
				class="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 rounded transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Tabs -->
		<div class="flex border-b border-border shrink-0">
			<button
				class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
				class:text-lt-cyan={activeTab === 'search'}
				class:border-lt-cyan={activeTab === 'search'}
				class:text-zinc-400={activeTab !== 'search'}
				class:border-transparent={activeTab !== 'search'}
				on:click={() => activeTab = 'search'}
			>
				Add Existing User
			</button>
			<button
				class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
				class:text-lt-cyan={activeTab === 'invite'}
				class:border-lt-cyan={activeTab === 'invite'}
				class:text-zinc-400={activeTab !== 'invite'}
				class:border-transparent={activeTab !== 'invite'}
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
					<div class="text-sm font-medium text-zinc-400 mb-3">Current Members ({memberships.length})</div>
					{#if isLoading}
						<div class="text-zinc-500 text-center py-4">Loading...</div>
					{:else if error}
						<div class="text-red-400 text-center py-4">{error}</div>
					{:else if memberships.length === 0}
						<div class="text-zinc-500 text-center py-4">No members yet</div>
					{:else}
						<div class="space-y-2">
							{#each memberships as member (member.id)}
								<div class="flex items-center gap-3 p-2 rounded-md hover:bg-surface-2 group">
									<div
										class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
										style="background-color: {member.color || '#666'}"
									>
										{getInitials(member.full_name)}
									</div>
									<div class="flex-1 min-w-0">
										<div class="text-zinc-100 text-sm truncate">{member.full_name}</div>
										{#if editingRoleFor === member.id}
											<select
												bind:value={newRoleFor}
												class="mt-1 text-xs px-2 py-1 bg-surface-3 border border-border rounded text-zinc-100"
											>
												{#each roles as role}
													<option value={role.id}>{role.name}</option>
												{/each}
											</select>
										{:else}
											<div class="text-zinc-500 text-xs">{member.role_name}</div>
										{/if}
									</div>
									<div class="flex items-center gap-1 shrink-0">
										{#if editingRoleFor === member.id}
											<button
												class="p-1 text-green-400 hover:text-green-300"
												on:click={() => saveRoleChange(member)}
												title="Save role"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
												</svg>
											</button>
											<button
												class="p-1 text-zinc-500 hover:text-zinc-300"
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
													class="p-1.5 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
													title="Change role"
													on:click={() => startEditRole(member)}
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
													</svg>
												</button>
												<button
													class="p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
						<div class="text-sm font-medium text-zinc-400">Add to project</div>
						{#if selectedUser}
							<div class="flex items-center gap-2">
								<div class="flex-1 flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded-md">
									<div class="w-6 h-6 rounded-full bg-lt-teal/20 text-lt-teal text-xs flex items-center justify-center">
										{getInitials(selectedUser.full_name || selectedUser.username)}
									</div>
									<span class="text-zinc-100 text-sm">{selectedUser.full_name || selectedUser.username}</span>
									<button on:click={() => selectedUser = null} class="ml-auto text-zinc-500 hover:text-zinc-300">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
								<select
									bind:value={selectedRole}
									class="px-2 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 text-sm"
								>
									{#each roles as role}
										<option value={role.id}>{role.name}</option>
									{/each}
								</select>
								<button
									on:click={handleAddMember}
									disabled={isAdding}
									class="px-3 py-2 bg-lt-cyan text-zinc-900 font-medium rounded-md text-sm hover:bg-lt-cyan/90 disabled:opacity-50"
								>
									{isAdding ? '...' : 'Add'}
								</button>
							</div>
						{:else}
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Type 2+ chars to search users..."
								class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan"
							/>
							{#if isLoadingUsers}
								<p class="text-zinc-500 text-sm">Loading users...</p>
							{:else if filteredUsers.length > 0}
								<div class="max-h-48 overflow-y-auto border border-border rounded-md">
									{#each filteredUsers as user}
										<button
											on:click={() => selectUser(user)}
											class="w-full text-left px-3 py-2 hover:bg-surface-3 transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
										>
											<div class="w-6 h-6 rounded-full bg-lt-teal/20 text-lt-teal text-xs flex items-center justify-center">
												{getInitials(user.full_name || user.username)}
											</div>
											<div class="flex-1 min-w-0">
												<div class="text-zinc-100 text-sm truncate">{user.full_name || user.username}</div>
												<div class="text-zinc-500 text-xs">@{user.username}</div>
											</div>
											<span class="text-xs text-zinc-500">Click to add</span>
										</button>
									{/each}
								</div>
							{:else if searchQuery.length >= 2 && usersLoaded}
								<p class="text-zinc-500 text-sm mt-2">No users found matching "{searchQuery}"</p>
							{:else if searchQuery.length > 0 && searchQuery.length < 2}
								<p class="text-zinc-600 text-sm mt-2">Type at least 2 characters to search</p>
							{/if}
						{/if}
					</div>
				</div>
			{:else}
				<!-- Invite by username -->
				<div class="p-4 space-y-4">
					<div class="text-sm text-zinc-400">
						Enter the username of a person who already has a Taiga account. They will be added to the project with the selected role — no email required.
					</div>

					<div>
						<label for="invite-username" class="block text-sm font-medium text-zinc-400 mb-1">
							Username
						</label>
						<input
							id="invite-username"
							type="text"
							bind:value={inviteUsername}
							placeholder="their-username"
							class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan"
						/>
					</div>

					<div>
						<label for="invite-role" class="block text-sm font-medium text-zinc-400 mb-1">
							Role
						</label>
						<select
							id="invite-role"
							bind:value={inviteRole}
							class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100"
						>
							{#each roles as role}
								<option value={role.id}>{role.name}</option>
							{/each}
						</select>
					</div>

					{#if inviteError}
						<div class="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
							{inviteError}
						</div>
					{/if}

					<button
						on:click={handleInviteByUsername}
						disabled={!inviteUsername.trim() || !inviteRole || isInviting}
						class="w-full py-2 px-4 bg-lt-cyan text-zinc-900 font-medium rounded-md hover:bg-lt-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{isInviting ? 'Adding...' : 'Add to Project'}
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>