<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import Avatar from './Avatar.svelte';
	import { initialsFor } from '$lib/utils/initials';
	import { getMe, updateMe, changeAvatar, removeAvatar, MAX_DISPLAY_NAME, type Me } from '$lib/api/users';

	const dispatch = createEventDispatcher<{ close: void; updated: Me }>();

	// Taiga gives each user one of these; they are the avatar background.
	const presetColors = [
		'#40A8E5', '#54D1DB', '#70CF97', '#FFC66D',
		'#FF9F43', '#F57D7D', '#C49ADE', '#D917A3'
	];

	let me: Me | null = null;
	let displayName = '';
	let color = '';
	let isLoading = true;
	let saving = false;
	let uploading = false;
	let error = '';
	let saved = false;
	let fileInput: HTMLInputElement;

	$: preview = initialsFor(displayName || me?.username);
	$: dirty = !!me && (displayName.trim() !== me.full_name || color !== me.color);

	onMount(load);

	async function load() {
		isLoading = true;
		error = '';
		try {
			me = await getMe();
			displayName = me.full_name;
			color = me.color;
		} catch (err) {
			error = (err as Error).message;
		} finally {
			isLoading = false;
		}
	}

	function applyUser(updated: Me) {
		me = updated;
		displayName = updated.full_name;
		color = updated.color;
		saved = true;
		dispatch('updated', updated);
	}

	async function save() {
		if (!me || saving) return;
		saving = true;
		error = '';
		try {
			applyUser(await updateMe(me.id, { full_name: displayName.trim(), color }));
		} catch (err) {
			error = (err as Error).message;
		} finally {
			saving = false;
		}
	}

	async function onFile(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		uploading = true;
		error = '';
		try {
			applyUser(await changeAvatar(file));
		} catch (err) {
			error = (err as Error).message;
		} finally {
			uploading = false;
			if (fileInput) fileInput.value = '';
		}
	}

	async function dropPicture() {
		uploading = true;
		error = '';
		try {
			applyUser(await removeAvatar());
		} catch (err) {
			error = (err as Error).message;
		} finally {
			uploading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') dispatch('close');
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" on:click={() => dispatch('close')}>
	<div
		class="bg-surface-1 border border-border rounded-lg shadow-2xl w-full max-w-md flex flex-col"
		on:click|stopPropagation
	>
		<div class="flex items-center justify-between p-4 border-b border-border">
			<div>
				<h2 class="text-lg font-semibold text-zinc-100">Your profile</h2>
				<p class="text-sm text-zinc-500">How your name and icon appear on every card</p>
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

		{#if isLoading}
			<div class="p-8 text-center text-zinc-500">Loading...</div>
		{:else if !me}
			<div class="p-8 text-center text-red-400">{error || 'Could not load your profile'}</div>
		{:else}
			<div class="p-4 space-y-5">
				<!-- Icon -->
				<div class="flex items-center gap-4">
					<Avatar name={displayName || me.username} photo={me.photo} {color} size="xl" class="text-white" />
					<div class="space-y-2">
						<div class="flex gap-2">
							<button
								on:click={() => fileInput.click()}
								disabled={uploading}
								class="px-3 py-1.5 text-sm bg-surface-2 border border-border rounded-md text-zinc-200 hover:bg-surface-3 disabled:opacity-50"
							>
								{uploading ? '...' : me.photo ? 'Replace picture' : 'Upload a picture'}
							</button>
							{#if me.photo}
								<button
									on:click={dropPicture}
									disabled={uploading}
									class="px-3 py-1.5 text-sm text-zinc-400 hover:text-red-400 disabled:opacity-50"
								>Remove</button>
							{/if}
						</div>
						<p class="text-xs text-zinc-500">
							{#if me.photo}
								Remove the picture to go back to letters.
							{:else}
								With no picture, the icon is <span class="text-zinc-300 font-medium">{preview}</span> — the first letters of your display name.
							{/if}
						</p>
					</div>
					<input
						type="file"
						accept="image/*"
						bind:this={fileInput}
						on:change={onFile}
						class="hidden"
					/>
				</div>

				<!-- Display name -->
				<div>
					<label for="profile-display-name" class="block text-sm font-medium text-zinc-400 mb-1">Display name</label>
					<input
						id="profile-display-name"
						type="text"
						bind:value={displayName}
						maxlength={MAX_DISPLAY_NAME}
						placeholder={me.username}
						class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan"
					/>
					<p class="text-xs text-zinc-500 mt-1">
						Two words give two letters: "Jefferson Richards" shows as JR.
					</p>
				</div>

				<!-- Colour -->
				<div>
					<span class="block text-sm font-medium text-zinc-400 mb-2">Icon colour</span>
					<div class="flex gap-2 flex-wrap">
						{#each presetColors as preset}
							<button
								on:click={() => color = preset}
								class="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
								class:border-zinc-100={color?.toLowerCase() === preset.toLowerCase()}
								class:border-transparent={color?.toLowerCase() !== preset.toLowerCase()}
								style="background-color: {preset}"
								title={preset}
								aria-label="Use {preset}"
							></button>
						{/each}
					</div>
				</div>

				{#if error}
					<p class="text-sm text-red-400">{error}</p>
				{/if}
			</div>

			<div class="flex items-center justify-end gap-2 p-4 border-t border-border">
				{#if saved && !dirty}
					<span class="text-sm text-zinc-500 mr-auto">Saved</span>
				{/if}
				<button
					on:click={() => dispatch('close')}
					class="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200"
				>Close</button>
				<button
					on:click={save}
					disabled={saving || !dirty}
					class="px-3 py-2 bg-lt-cyan text-zinc-900 font-medium rounded-md text-sm hover:bg-lt-cyan/90 disabled:opacity-50"
				>{saving ? 'Saving...' : 'Save'}</button>
			</div>
		{/if}
	</div>
</div>
