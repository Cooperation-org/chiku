import { describe, it, expect } from 'vitest';
import { countingRoles, pointChoices, pointsPatch, storyPointId, unestimatedPoint } from '../points';
import type { Point, Project, Role, UserStory } from '../types';

const BLANK = 1; // "?" — no estimate
const ONE = 2;
const THREE = 3;

function point(id: number, name: string, value: number | null): Point {
	return { id, name, value, order: id, project: 1 };
}

function role(id: number, name: string, computable: boolean, order: number): Role {
	return { id, name, computable, order, project: 1 };
}

function project(overrides: Partial<Project> = {}): Project {
	return {
		points: [point(THREE, '3', 3), point(BLANK, '?', null), point(ONE, '1', 1)],
		roles: [
			role(20, 'Stakeholder', false, 0),
			role(10, 'Back', true, 2),
			role(11, 'Front', true, 1)
		],
		...overrides
	} as Project;
}

function story(points: Record<string, number>): UserStory {
	return { points } as UserStory;
}

describe('the point catalog', () => {
	it('finds the option that means unestimated', () => {
		expect(unestimatedPoint(project())?.id).toBe(BLANK);
	});

	it('offers unestimated first, then ascending', () => {
		expect(pointChoices(project()).map((p) => p.name)).toEqual(['?', '1', '3']);
	});

	it('counts only the roles that count, in the project order', () => {
		expect(countingRoles(project()).map((r) => r.name)).toEqual(['Front', 'Back']);
	});
});

describe('reading a story estimate', () => {
	it('is null when no role carries one', () => {
		expect(storyPointId(story({ '10': BLANK, '11': BLANK }), project())).toBeNull();
	});

	it('reads the estimate whichever counting role holds it', () => {
		// Estimated per-role by Taiga's own UI, on the second role.
		expect(storyPointId(story({ '10': THREE, '11': BLANK }), project())).toBe(THREE);
	});

	it('ignores roles whose estimates do not count', () => {
		expect(storyPointId(story({ '20': THREE }), project())).toBeNull();
	});
});

describe('writing a story estimate', () => {
	it('puts the estimate on one role and blanks the rest, so the total is what was picked', () => {
		expect(pointsPatch(THREE, project())).toEqual({ '11': THREE, '10': BLANK });
	});

	it('replaces an estimate left on another role rather than adding to it', () => {
		// The dangerous case: 3 on Back, now picking 1. Without blanking Back the
		// total would read 4 while the card shows 1.
		const patch = pointsPatch(ONE, project());
		expect(patch).toEqual({ '11': ONE, '10': BLANK });
	});

	it('clears every counting role when the estimate is removed', () => {
		expect(pointsPatch(null, project())).toEqual({ '11': BLANK, '10': BLANK });
	});

	it('declines when the catalog cannot express unestimated', () => {
		expect(pointsPatch(THREE, project({ points: [point(ONE, '1', 1)] }))).toBeNull();
	});

	it('declines when no role counts', () => {
		expect(pointsPatch(THREE, project({ roles: [role(20, 'Stakeholder', false, 0)] }))).toBeNull();
	});
});
