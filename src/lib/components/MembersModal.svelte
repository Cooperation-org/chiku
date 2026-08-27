<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { getProjectMemberships, getProjectRoles, getAllUsers, searchUsers, addMembership, removeMembership } from '$lib/api/memberships';
	import type { Membership, Role } from '$lib/api/memberships';
	import Avatar from './Avatar.svelte';

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

	// Add member state
	let searchQuery = '';
	let selectedUser: { id: number; username: string; full_name: string } | null = null;
	let selectedRole: number | null = null;
	let isAdding = false;

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
			// Taiga returns a server error when email notification fails, but the membership
			// is still created. Reload to confirm actual state.
			const refreshed = await getProjectMemberships(projectId).catch(() => null);
			if (refreshed) {
				const wasAdded = refreshed.some(m => m.user === selectedUser?.id);
				memberships = refreshed;
				if (wasAdded) {
					selectedUser = null;
				} else {
					alert('Failed to add member: ' + (err as Error).message);
				}
			} else {
				alert('Failed to add member: ' + (err as Error).message);
			}
		} finally {
			isAdding = false;
		}
	}

	async function handleRemoveMember(membership: Membership) {
		if (!confirm(`Remove ${membership.full_name} from this project?`)) return;

		// Optimistic remove
		const original = memberships;
		memberships = memberships.filter(m => m.id !== membership.id);

		try {
			await removeMembership(membership.id);
		} catch (err) {
			alert('Failed to remove member: ' + (err as Error).message);
			memberships = original;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			dispatch('close');
		}
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

		<!-- Current Members -->
		<div class="flex-1 overflow-y-auto">
			<div class="p-4 border-b border-border">
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
								<Avatar
									name={member.full_name}
									photo={member.photo}
									color={member.color || '#666'}
									class="text-white"
								/>
								<div class="flex-1 min-w-0">
									<div class="text-zinc-100 text-sm truncate">{member.full_name}</div>
									<div class="text-zinc-500 text-xs">{member.role_name}</div>
								</div>
								{#if !member.is_owner}
									<button
										on:click={() => handleRemoveMember(member)}
										class="p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
										title="Remove member"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Add New Member -->
			<div class="p-4 space-y-3">
				<div class="text-sm font-medium text-zinc-400">Add New Member</div>

				{#if selectedUser}
					<div class="flex items-center gap-2">
						<div class="flex-1 flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded-md">
							<Avatar
								name={selectedUser.full_name || selectedUser.username}
								size="sm"
								class="bg-lt-teal/20 text-lt-teal"
							/>
							<span class="text-zinc-100">{selectedUser.full_name || selectedUser.username}</span>
							<button on:click={() => selectedUser = null} class="ml-auto text-zinc-500 hover:text-zinc-300">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						<select
							bind:value={selectedRole}
							class="px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 text-sm"
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
						placeholder="Type 2+ chars to search by name or username..."
						class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan"
					/>
					{#if isLoadingUsers}
						<p class="text-zinc-500 text-sm mt-2">Loading users...</p>
					{:else if filteredUsers.length > 0}
						<div class="mt-2 max-h-48 overflow-y-auto border border-border rounded-md">
							{#each filteredUsers as user}
								<button
									on:click={() => selectUser(user)}
									class="w-full text-left px-3 py-2 hover:bg-surface-3 transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
								>
										<Avatar
											name={user.full_name || user.username}
											size="sm"
											class="bg-lt-teal/20 text-lt-teal"
										/>
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
	</div>
</div>
