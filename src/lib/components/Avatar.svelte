<script lang="ts">
	import { initialsFor } from '$lib/utils/initials';

	/** The name the initials come from — full_name_display, or the username. */
	export let name: string | null | undefined = null;
	/** Taiga's uploaded picture, when the person has one. */
	export let photo: string | null | undefined = null;
	/** Background for the initials. Taiga gives every user a colour. */
	export let color: string | null | undefined = null;
	export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
	/** Extra classes, so each place keeps the look it already had. */
	let extraClass = '';
	export { extraClass as class };

	const boxes = {
		sm: 'w-6 h-6 text-[10px]',
		md: 'w-8 h-8 text-xs',
		lg: 'w-12 h-12 text-sm',
		xl: 'w-16 h-16 text-lg'
	};

	$: label = name ?? '';
	$: initials = initialsFor(name);
	$: box = boxes[size];
</script>

{#if photo}
	<img
		src={photo}
		alt={label}
		title={label}
		class="{box} {extraClass} rounded-full object-cover shrink-0"
	/>
{:else}
	<div
		class="{box} {extraClass} rounded-full flex items-center justify-center font-medium shrink-0"
		style={color ? `background-color: ${color}` : ''}
		title={label}
	>
		{initials}
	</div>
{/if}
