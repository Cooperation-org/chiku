import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import {
  changeLogo,
  createTemplateFromProject,
  duplicateProject,
  getExportDump,
  getProjectModules,
  leaveProject,
  removeLogo,
  transferAccept,
  transferReject,
  transferRequest,
  transferStart,
  transferValidateToken,
  updateProjectModules,
  type DuplicateProjectData,
} from "@/lib/api/project-settings"
import {
  createWebhook,
  deleteWebhook,
  listWebhookLogs,
  listWebhooks,
  resendWebhookLog,
  testWebhook,
  updateWebhook,
  type CreateWebhookData,
} from "@/lib/api/webhooks"
import { listNotifyPolicies, updateNotifyPolicy } from "@/lib/api/notify-policies"
import { listProjectTemplates } from "@/lib/api/project-templates"
import type { Project, ProjectModules, Webhook, WebhookLog } from "@/lib/api/types"

function refreshProject(qc: ReturnType<typeof useQueryClient>, project: Project) {
  qc.setQueryData<Project[]>(qk.projects, (old) =>
    old?.map((p) => (p.id === project.id ? project : p)),
  )
  qc.invalidateQueries({ queryKey: qk.project(project.id) })
}

export function useProjectModules(projectId: number | null) {
  return useQuery({
    queryKey: qk.projectModules(projectId ?? 0),
    queryFn: () => getProjectModules(projectId!),
    enabled: projectId != null,
  })
}

export function useUpdateModules(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ProjectModules>) => updateProjectModules(projectId, data),
    onSuccess: (_data, vars) => {
      qc.setQueryData<ProjectModules>(qk.projectModules(projectId), (old) => ({
        ...old,
        ...vars,
      }))
    },
  })
}

export function useChangeLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, file }: { projectId: number; file: File }) =>
      changeLogo(projectId, file),
    onSuccess: (updated) => refreshProject(qc, updated),
  })
}

export function useRemoveLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (projectId: number) => removeLogo(projectId),
    onSuccess: (updated) => refreshProject(qc, updated),
  })
}

export function useLeaveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (projectId: number) => leaveProject(projectId),
    onSuccess: (_data, projectId) => {
      qc.setQueryData<Project[]>(qk.projects, (old) => old?.filter((p) => p.id !== projectId))
      qc.removeQueries({ queryKey: qk.project(projectId) })
    },
  })
}

export function useDuplicateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: DuplicateProjectData }) =>
      duplicateProject(projectId, data),
    onSuccess: (created) => {
      qc.setQueryData<Project[]>(qk.projects, (old) => [created, ...(old ?? [])])
    },
  })
}

export function useCreateTemplate() {
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number
      data: { template_name: string; template_description: string }
    }) => createTemplateFromProject(projectId, data),
  })
}

export function useTransferStart(projectId: number) {
  return useMutation({
    mutationFn: (userId: number) => transferStart(projectId, userId),
  })
}

export function useTransferRequest(projectId: number) {
  return useMutation({
    mutationFn: () => transferRequest(projectId),
  })
}

export function useTransferValidate(projectId: number) {
  return useMutation({
    mutationFn: (token: string) => transferValidateToken(projectId, token),
  })
}

export function useTransferAccept(projectId: number) {
  return useMutation({
    mutationFn: (data: { token: string; reason: string }) => transferAccept(projectId, data),
  })
}

export function useTransferReject(projectId: number) {
  return useMutation({
    mutationFn: (data: { token: string; reason: string }) => transferReject(projectId, data),
  })
}

export function useWebhooks(projectId: number | null) {
  return useQuery({
    queryKey: qk.webhooks(projectId ?? 0),
    queryFn: () => listWebhooks(projectId!),
    enabled: projectId != null,
  })
}

export function useCreateWebhook(projectId: number) {
  const qc = useQueryClient()
  const key = qk.webhooks(projectId)
  return useMutation({
    mutationFn: (data: Omit<CreateWebhookData, "project">) =>
      createWebhook({ ...data, project: projectId }),
    onSuccess: (created: Webhook) => {
      qc.setQueryData<Webhook[]>(key, (old) => [...(old ?? []), created])
    },
  })
}

export function useUpdateWebhook(projectId: number) {
  const qc = useQueryClient()
  const key = qk.webhooks(projectId)
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateWebhookData> }) =>
      updateWebhook(id, data),
    onSuccess: (updated: Webhook) => {
      qc.setQueryData<Webhook[]>(key, (old) =>
        old?.map((w) => (w.id === updated.id ? updated : w)),
      )
    },
  })
}

export function useDeleteWebhook(projectId: number) {
  const qc = useQueryClient()
  const key = qk.webhooks(projectId)
  return useMutation({
    mutationFn: (webhookId: number) => deleteWebhook(webhookId),
    onSuccess: (_data, webhookId) => {
      qc.setQueryData<Webhook[]>(key, (old) => old?.filter((w) => w.id !== webhookId))
    },
  })
}

export function useTestWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (webhookId: number) => testWebhook(webhookId),
    onSuccess: (log: WebhookLog) => {
      qc.setQueryData<WebhookLog[]>(qk.webhookLogs(log.webhook), (old) => [log, ...(old ?? [])])
    },
  })
}

export function useWebhookLogs(webhookId: number | null) {
  return useQuery({
    queryKey: qk.webhookLogs(webhookId ?? 0),
    queryFn: () => listWebhookLogs(webhookId!),
    enabled: webhookId != null,
  })
}

export function useResendLog(webhookId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (logId: number) => resendWebhookLog(logId),
    onSuccess: (log: WebhookLog) => {
      qc.setQueryData<WebhookLog[]>(qk.webhookLogs(webhookId), (old) => [log, ...(old ?? [])])
    },
  })
}

export function useNotifyPolicies() {
  return useQuery({ queryKey: qk.notifyPolicies(), queryFn: listNotifyPolicies })
}

/** The policy row for one project, if the backend returned it. */
export function useNotifyPolicy(projectId: number | null) {
  const query = useNotifyPolicies()
  const policy = query.data?.find((p) => p.project === projectId) ?? null
  return { ...query, policy }
}

export function useUpdateNotifyPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notify_level }: { id: number; notify_level: number }) =>
      updateNotifyPolicy(id, { notify_level }),
    onSuccess: (updated) => {
      qc.setQueryData<Awaited<ReturnType<typeof listNotifyPolicies>>>(
        qk.notifyPolicies(),
        (old) => old?.map((p) => (p.id === updated.id ? updated : p)),
      )
    },
  })
}

export function useProjectTemplates(enabled = true) {
  return useQuery({
    queryKey: qk.projectTemplates(),
    queryFn: listProjectTemplates,
    enabled,
  })
}

export { getExportDump }
