import { api } from './client';
import type { Attachment } from './types';

export async function getStoryAttachments(
	storyId: number,
	projectId: number
): Promise<Attachment[]> {
	const list = await api.get<Attachment[]>('/userstories/attachments', {
		object_id: storyId,
		project: projectId
	});
	return list.sort((a, b) => a.created_date.localeCompare(b.created_date));
}

export async function uploadStoryAttachment(
	storyId: number,
	projectId: number,
	file: File,
	description = ''
): Promise<Attachment> {
	const form = new FormData();
	form.append('project', String(projectId));
	form.append('object_id', String(storyId));
	form.append('attached_file', file, file.name);
	if (description) form.append('description', description);
	return api.postForm<Attachment>('/userstories/attachments', form);
}

export async function deleteStoryAttachment(attachmentId: number): Promise<void> {
	await api.delete(`/userstories/attachments/${attachmentId}`);
}

const TEXT_EXTENSIONS = ['md', 'markdown', 'txt', 'csv', 'log', 'json', 'yml', 'yaml'];

export function extensionOf(name: string): string {
	const dot = name.lastIndexOf('.');
	return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export function isMarkdown(a: Attachment): boolean {
	const ext = extensionOf(a.name);
	return ext === 'md' || ext === 'markdown';
}

/** Text-ish files we can show inline rather than only offering a download. */
export function isPreviewableText(a: Attachment): boolean {
	return TEXT_EXTENSIONS.includes(extensionOf(a.name));
}

export function isImage(a: Attachment): boolean {
	return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(extensionOf(a.name));
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
