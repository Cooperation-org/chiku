import { api } from "./client"
import type { NotifyPolicy } from "./types"

export async function listNotifyPolicies(): Promise<NotifyPolicy[]> {
  return api.get<NotifyPolicy[]>("/notify-policies")
}

export async function updateNotifyPolicy(
  policyId: number,
  data: { notify_level: number },
): Promise<NotifyPolicy> {
  return api.patch<NotifyPolicy>(`/notify-policies/${policyId}`, data)
}
