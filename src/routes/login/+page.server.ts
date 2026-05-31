import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
	return {
		googleClientId: env.GOOGLE_CLIENT_ID || ''
	};
};