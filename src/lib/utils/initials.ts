/**
 * The letters shown in a person's avatar when they have no picture.
 *
 * One word gives two letters, not one: a cohort has several people whose whole
 * Taiga name is a first name, and a wall of "J" tells nobody which J. Anything
 * that is not a letter or a digit is dropped, so "amebo (agent)" reads AA rather
 * than "A(".
 *
 * The letters follow the name, so anyone who wants different ones sets a
 * different display name (Profile → Display name).
 */
export function initialsFor(name: string | null | undefined): string {
	const words = (name ?? '')
		.split(/\s+/)
		.map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
		.filter(Boolean);

	if (words.length === 0) return '?';
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return (words[0][0] + words[1][0]).toUpperCase();
}
