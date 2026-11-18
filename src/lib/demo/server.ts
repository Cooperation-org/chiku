// Answers the API for the public demo build from sample data. Reads only:
// every write is refused, and nothing leaves the browser.
import { epics, memberships, milestones, project, stories, statuses, users } from './data';

export const READ_ONLY = 'This is a read-only demo.';

type Params = Record<string, string | number | boolean | undefined> | undefined;

/** The demo's answer to GET `endpoint`, or undefined when the demo has nothing there. */
export function demoGet(endpoint: string, params: Params): unknown {
	const p = params || {};
	const path = endpoint.replace(/\/+$/, '');
	let m: RegExpMatchArray | null;

	if (path === '/projects/by_slug') return p.slug === project.slug ? project : undefined;
	if (path === '/projects') return [project];
	if ((m = path.match(/^\/projects\/(\d+)$/))) return Number(m[1]) === project.id ? project : undefined;
	if (path === '/userstory-statuses') return statuses;
	if (path === '/userstories') {
		if (p.page && Number(p.page) > 1) return [];
		let list = stories;
		if (p.milestone !== undefined) list = list.filter((s) => String(s.milestone) === String(p.milestone));
		if (p.assigned_to !== undefined) list = list.filter((s) => String(s.assigned_to) === String(p.assigned_to));
		return [...list].sort((a, b) => b.modified_date.localeCompare(a.modified_date));
	}
	if (path === '/userstories/attachments') return [];
	if ((m = path.match(/^\/userstories\/(\d+)$/))) return stories.find((s) => s.id === Number(m![1]));
	if ((m = path.match(/^\/history\/userstory\/(\d+)$/))) return [];
	if (path === '/memberships') return memberships;
	if (path === '/roles') return project.roles;
	if (path === '/users') return users;
	if (path === '/epics') return epics;
	if ((m = path.match(/^\/epics\/(\d+)$/))) return epics.find((e) => e.id === Number(m![1]));
	if (path === '/milestones') return milestones;
	if ((m = path.match(/^\/milestones\/(\d+)$/))) return milestones.find((x) => x.id === Number(m![1]));
	return undefined;
}
