/**
 * Story estimates.
 *
 * Taiga does not store one number on a story. It stores an estimate per role
 * (`story.points` maps a role id to an option out of the project's fixed point
 * catalog), and `total_points` is the sum across the roles that count. Teams
 * that estimate once — including any team reading points as hours — want a
 * single number, so these helpers collapse the per-role model into one:
 * the estimate is carried by the first counting role, and every other counting
 * role is set to the catalog's unestimated option, which adds nothing. The
 * total then equals exactly the number the person picked.
 *
 * Pure functions on purpose — the modal does the talking to the API.
 */

import type { Point, Project, UserStory } from './types';

/** The catalog option meaning "nobody has estimated this" (Taiga's "?", value null). */
export function unestimatedPoint(project: Project): Point | null {
	return project.points.find((p) => p.value === null) ?? null;
}

/** Options a person can pick, unestimated first, then by ascending value. */
export function pointChoices(project: Project): Point[] {
	return [...project.points].sort((a, b) => {
		if (a.value === null) return -1;
		if (b.value === null) return 1;
		return a.value - b.value;
	});
}

/** The roles whose estimates count towards the total, in the project's own order. */
export function countingRoles(project: Project) {
	return project.roles.filter((r) => r.computable).sort((a, b) => a.order - b.order);
}

/**
 * The option a story currently carries, or null when it has none.
 *
 * Takes the first counting role that holds a real estimate, so a story estimated
 * the old per-role way still shows a number rather than reading as untouched.
 */
export function storyPointId(story: UserStory, project: Project): number | null {
	const blank = unestimatedPoint(project)?.id ?? null;
	for (const role of countingRoles(project)) {
		const pointId = story.points?.[String(role.id)];
		if (pointId != null && pointId !== blank) return pointId;
	}
	return null;
}

/**
 * The `points` patch that makes a story worth exactly `pointId`, and nothing more.
 *
 * Every counting role is written: the first carries the estimate, the rest are
 * blanked. Without blanking the others an estimate would add to whatever a
 * previous one left behind, and the total would drift above what is on screen.
 * Passing null clears the story back to unestimated.
 */
export function pointsPatch(
	pointId: number | null,
	project: Project
): Record<string, number> | null {
	const blank = unestimatedPoint(project)?.id;
	if (blank == null) return null; // a catalog with no "?" cannot express "unestimated"
	const roles = countingRoles(project);
	if (roles.length === 0) return null;
	const patch: Record<string, number> = {};
	roles.forEach((role, index) => {
		patch[String(role.id)] = index === 0 && pointId !== null ? pointId : blank;
	});
	return patch;
}
