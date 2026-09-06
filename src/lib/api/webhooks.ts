import { api } from "./client"
import type { Webhook, WebhookLog } from "./types"

export async function listWebhooks(projectId: number): Promise<Webhook[]> {
  return api.get<Webhook[]>("/webhooks", { project: projectId })
}

export interface CreateWebhookData {
  project: number
  name: string
  url: string
  key: string
}

export async function createWebhook(data: CreateWebhookData): Promise<Webhook> {
  return api.post<Webhook>("/webhooks", data)
}

export async function updateWebhook(
  webhookId: number,
  data: Partial<CreateWebhookData>,
): Promise<Webhook> {
  return api.patch<Webhook>(`/webhooks/${webhookId}`, data)
}

export async function deleteWebhook(webhookId: number): Promise<void> {
  await api.delete<void>(`/webhooks/${webhookId}`)
}

/** Fire a test delivery — returns the resulting log entry. */
export async function testWebhook(webhookId: number): Promise<WebhookLog> {
  return api.post<WebhookLog>(`/webhooks/${webhookId}/test`)
}

export async function listWebhookLogs(webhookId: number): Promise<WebhookLog[]> {
  return api.get<WebhookLog[]>("/webhooklogs", { webhook: webhookId })
}

export async function resendWebhookLog(logId: number): Promise<WebhookLog> {
  return api.post<WebhookLog>(`/webhooklogs/${logId}/resend`)
}
