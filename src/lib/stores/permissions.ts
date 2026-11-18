import { derived } from 'svelte/store';
import { auth } from './auth';
import { currentProject } from './project';

/**
 * Whether the person may change the open project. A visitor who is not signed
 * in, on a public project, may only read it. Taiga answers each project with
 * the caller's `my_permissions`; when that is missing we keep the old behaviour
 * (signed in means editable) and let Taiga refuse what it must.
 */
export const canEdit = derived([auth, currentProject], ([$auth, $project]) => {
	if (!$auth.isAuthenticated) return false;
	const perms = $project?.my_permissions;
	return perms ? perms.includes('modify_us') : true;
});
