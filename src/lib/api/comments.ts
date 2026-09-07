import { api } from './client';
import type { HistoryEntry } from './types';

export async function getStoryComments(storyId: number): Promise<HistoryEntry[]> {
	const history = await api.get<HistoryEntry[]>(`/history/userstory/${storyId}`);
	// Filter to only entries that have a comment
	return history.filter(entry => entry.comment && entry.comment.trim().length > 0);
}

/** Taiga takes the entry id as a GET-style query param on these POSTs. */
export async function editStoryComment(storyId: number, entryId: string, comment: string): Promise<HistoryEntry> {
	return api.post<HistoryEntry>(`/history/userstory/${storyId}/edit_comment?id=${entryId}`, { comment });
}

export async function deleteStoryComment(storyId: number, entryId: string): Promise<void> {
	await api.post(`/history/userstory/${storyId}/delete_comment?id=${entryId}`);
}

export async function undeleteStoryComment(storyId: number, entryId: string): Promise<void> {
	await api.post(`/history/userstory/${storyId}/undelete_comment?id=${entryId}`);
}
