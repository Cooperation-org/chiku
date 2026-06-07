import { QueryClient } from '@tanstack/svelte-query';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 2, // 2 minutes
			retry: 1,
			refetchOnWindowFocus: false
		}
	}
});