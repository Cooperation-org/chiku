import { z } from "zod"

export const generalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name is too long"),
  description: z.string().trim().max(2000, "Description is too long"),
})

export type GeneralForm = z.infer<typeof generalSchema>

export const modulesSchema = z.object({
  is_kanban_activated: z.boolean(),
  is_backlog_activated: z.boolean(),
  is_epics_activated: z.boolean(),
  is_issues_activated: z.boolean(),
  is_wiki_activated: z.boolean(),
  is_contact_activated: z.boolean(),
  is_private: z.boolean(),
})

export type ModulesForm = z.infer<typeof modulesSchema>

export const notifyLevelSchema = z.object({
  notify_level: z.number().int().min(0).max(3),
})

export type NotifyLevelForm = z.infer<typeof notifyLevelSchema>

export const webhookSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name is too long"),
  url: z.string().trim().url("Must be a valid URL"),
  key: z.string().trim().min(1, "Secret key is required"),
})

export type WebhookForm = z.infer<typeof webhookSchema>

export const duplicateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name is too long"),
  description: z.string().trim().max(2000, "Description is too long"),
  is_private: z.boolean(),
})

export type DuplicateForm = z.infer<typeof duplicateSchema>

export const templateSchema = z.object({
  template_name: z.string().trim().min(1, "Template name is required").max(200),
  template_description: z.string().trim().max(2000).default(""),
})

export type TemplateForm = z.infer<typeof templateSchema>

export const transferTokenSchema = z.object({
  token: z.string().trim().min(1, "Transfer token is required"),
  reason: z.string().trim().max(1000).default(""),
})

export type TransferTokenForm = z.infer<typeof transferTokenSchema>

/** First zod issue message, for surfacing via toast.error. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input"
}
