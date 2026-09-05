import { api } from './client';
import type { HistoryEntry } from './types';

export async function getStoryComments(storyId: number): Promise<HistoryEntry[]> {
	const history = await api.get<HistoryEntry[]>(`/history/userstory/${storyId}`);
	// Filter to only entries that have a comment
	return history.filter(entry => entry.comment && entry.comment.trim().length > 0);
}
