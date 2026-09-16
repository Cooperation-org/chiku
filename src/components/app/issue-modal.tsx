import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link, useSearch } from "@tanstack/react-router"
import { toast } from "sonner"
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Link2,
  OctagonAlert,
  Pencil,
  Reply,
  Share2,
  Trash2,
  User as UserIcon,
} from "lucide-react"
import type { Attachment, HistoryEntry, Milestone, Project, UserStory, UserStoryStatus } from "@/lib/api/types"
import { getUserStory, updateUserStory } from "@/lib/api/userstories"
import { getMilestones } from "@/lib/api/milestones"
import { getProject } from "@/lib/api/projects"
import { pointsPatch, storyPointId } from "@/lib/api/points"
import {
  deleteStoryAttachment,
  formatFileSize,
  getStoryAttachments,
  isImage,
  isMarkdown,
  isPreviewableText,
  uploadStoryAttachment,
} from "@/lib/api/attachments"
import { Markdown } from "@/components/app/markdown"
import { MarkdownEditor } from "@/components/app/markdown-editor"
import { buildQuoteReply, type Mentionable } from "@/lib/mentions"
import { memberPath } from "@/lib/api/users"
import { api } from "@/lib/api/client"
import { useAuth } from "@/lib/stores/auth"
import { useToolbarSlots } from "@/lib/stores/toolbar-slots"
import { Avatar } from "@/components/app/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useUpdateStory } from "@/lib/queries/stories"
import {
  useComments,
  useDeleteStoryComment,
  useEditStoryComment,
  useUndeleteStoryComment,
} from "@/lib/queries/comments"
import { qk, queryClient } from "@/lib/query"
import { cn } from "cn"
import { StoryStatusSelect } from "@/components/inputs/story-status-select"
import { AssigneeSelect } from "@/components/inputs/assignee-select"
import { PointsSelect } from "@/components/inputs/points-select"
import { ValueBadge } from "@/components/app/value-badge"
import { ValueEditor } from "@/components/app/value-editor"
import { TaskSprintSelector } from "@/components/sprints/task-sprint-selector"
import { DatePicker, parseISODateString, toISODateString } from "@/components/ui/date-picker"
import { parseCashValue, parseTeamValue, setValueTags } from "@/lib/values"

interface IssueModalProps {
  story: UserStory
  statuses: UserStoryStatus[]
  members: { id: number; full_name: string; username: string }[]
  /** Project-scoped @mention candidates with real usernames (see useMentionable). */
  mentionable: Mentionable[]
  /** Project admins may edit/delete others' comments, matching Taiga's rule. */
  canModerate: boolean
  onClose: () => void
  onUpdate: (story: UserStory) => void
  onDelete: (id: number) => void
  /** Jump to another story by human ref — renders prev/next nav when set. */
  onNavigateRef?: (ref: number) => void
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/** Clipboard write with a legacy fallback for non-secure contexts. */
async function copyToClipboard(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    const ta = document.createElement("textarea")
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand("copy")
      toast.success(successMessage)
    } catch {
      toast.error("Could not copy link")
    }
    ta.remove()
  }
}

export function IssueModal({ story, statuses, members, mentionable, canModerate, onClose, onUpdate, onDelete, onNavigateRef }: IssueModalProps) {
  const [fullStory, setFullStory] = useState<UserStory>(story)
  const [project, setProject] = useState<Project | null>(null)
  /** Open sprints for the sprint picker — empty on Kanban-only projects. */
  const [milestones, setMilestones] = useState<Milestone[]>([])

  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingAll, setEditingAll] = useState(false)
  const [editSubject, setEditSubject] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editTagsText, setEditTagsText] = useState("")
  const [editDueDate, setEditDueDate] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  /** Comment awaiting delete confirmation (shadcn AlertDialog below). */
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<HistoryEntry | null>(null)

  const [pendingComments, setPendingComments] = useState<HistoryEntry[]>([])
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState("")
  const [newComment, setNewComment] = useState("")
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [commentError, setCommentError] = useState("")

  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [attachmentError, setAttachmentError] = useState("")
  const [uploadingNames, setUploadingNames] = useState<string[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [openAttachmentId, setOpenAttachmentId] = useState<number | null>(null)
  const [previewText, setPreviewText] = useState<Record<number, string>>({})
  const [previewError, setPreviewError] = useState<Record<number, string>>({})
  const fileInput = useRef<HTMLInputElement>(null)

  const { user: me } = useAuth()
  // Story writes (field saves, comments) go through the query mutation layer
  // so they register with the sync indicator and query inspector.
  const updateStory = useUpdateStory(fullStory.project)
  const { data: comments, isLoading: commentsLoading } = useComments(story.id)
  const editCommentMutation = useEditStoryComment(story.id)
  const deleteCommentMutation = useDeleteStoryComment(story.id)
  const undeleteCommentMutation = useUndeleteStoryComment(story.id)
  const breadcrumbEl = useToolbarSlots((s) => s.breadcrumbEl)
  const actionsEl = useToolbarSlots((s) => s.actionsEl)

  // Deep link support: ?comment=<history entry id> scrolls to and highlights
  // that comment. (DOM scroll is the sanctioned external-sync effect.)
  const search = useSearch({ strict: false }) as { comment?: number }
  const highlightId = search?.comment != null ? String(search.comment) : null
  const commentsResolved = comments !== undefined

  useEffect(() => {
    if (highlightId == null || !commentsResolved) return
    const el =
      document.getElementById(`comment-${highlightId}`) ?? document.getElementById("comments-section")
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [highlightId, commentsResolved])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const loaded = await getUserStory(story.id)
        if (!cancelled) {
          setFullStory(loaded)
          onUpdate(loaded)
        }
      } catch (err) {
        console.error("Failed to load story detail:", err)
      }
      try {
        setProject(await getProject(story.project))
      } catch (err) {
        // Without it the estimate stays read-only rather than the modal breaking.
        console.error("Failed to load project:", err)
      }
      try {
        setMilestones(await getMilestones(story.project))
      } catch (err) {
        // Kanban-only projects (or permission blocks) simply hide the picker.
        console.error("Failed to load sprints:", err)
      }
      try {
        const loaded = await getStoryAttachments(story.id, story.project)
        if (!cancelled) setAttachments(loaded)
      } catch (err) {
        if (!cancelled) setAttachmentError((err as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id])

  // Esc cascade: delete confirm → comment edit → field editing → confirm dialog → close.
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (confirmDeleteEntry) setConfirmDeleteEntry(null)
        else if (editingCommentId) setEditingCommentId(null)
        else if (editingField) setEditingField(null)
        else if (showDeleteConfirm) setShowDeleteConfirm(false)
        else onClose()
      }
    }
    window.addEventListener("keydown", onKeydown)
    return () => window.removeEventListener("keydown", onKeydown)
  }, [confirmDeleteEntry, editingCommentId, editingField, showDeleteConfirm, onClose])

  async function saveField(field: string, data: Record<string, unknown>) {
    const prev = { ...fullStory }
    setFullStory({ ...fullStory, ...data } as UserStory)
    onUpdate({ ...fullStory, ...data } as UserStory)
    if (!editingAll) setEditingField(null)

    // Routed through the query mutation layer so the sync indicator and
    // inspector register the write (offline queueing + retries apply too).
    updateStory.mutate(
      { id: fullStory.id, data: { ...data, version: prev.version } },
      {
        onSuccess: (updated) => {
          setFullStory(updated)
          onUpdate(updated)
        },
        onError: (err) => {
          console.error(`Failed to save ${field}:`, err)
          setFullStory(prev)
          onUpdate(prev)
          toast.error(`Failed to save: ${(err as Error).message}`)
        },
      },
    )
  }

  function startEdit(field: string) {
    if (field === "subject") setEditSubject(fullStory.subject)
    if (field === "description") setEditDescription(fullStory.description || "")
    if (field === "tags") setEditTagsText(fullStory.tags?.map((t) => t[0]).join(", ") || "")
    if (field === "due_date") setEditDueDate(fullStory.due_date || "")
    setEditingField(field)
  }

  function toggleEditAll() {
    const next = !editingAll
    setEditingAll(next)
    if (next) {
      setEditSubject(fullStory.subject)
      setEditDescription(fullStory.description || "")
      setEditTagsText(fullStory.tags?.map((t) => t[0]).join(", ") || "")
      setEditDueDate(fullStory.due_date || "")
      setEditingField("all")
    } else {
      setEditingField(null)
    }
  }

  const isEditing = (field: string) => editingField === field || editingField === "all"

  const currentPointId = project ? storyPointId(fullStory, project) : null
  const currentPointName = project?.points.find((p) => p.id === currentPointId)?.name ?? null

  function saveSubject() {
    if (!editSubject.trim()) return
    if (editSubject.trim() === fullStory.subject) {
      if (!editingAll) setEditingField(null)
      return
    }
    saveField("subject", { subject: editSubject.trim() })
  }

  function saveDescription() {
    if (editDescription.trim() === (fullStory.description || "")) {
      if (!editingAll) setEditingField(null)
      return
    }
    saveField("description", { description: editDescription.trim() })
  }

  function saveStatus(statusId: number) {
    if (statusId === fullStory.status) return
    saveField("status", { status: statusId })
  }

  function saveAssignee(userId: number | null) {
    if (userId === fullStory.assigned_to) return
    saveField("assigned_to", { assigned_to: userId })
  }

  /** Plan into a sprint (or back to the backlog with null). */
  function saveSprint(milestoneId: number | null) {
    if (milestoneId === fullStory.milestone) return
    saveField("milestone", { milestone: milestoneId })
  }

  function savePoints(pointId: number | null) {
    const patch = project ? pointsPatch(pointId, project) : null
    if (!patch) {
      setEditingField(null)
      return
    }
    saveField("points", { points: patch })
  }

  function saveTags() {
    const existingTagColors = new Map(fullStory.tags?.map((t) => [t[0], t[1]]) || [])
    const newTags: [string, string | null][] = editTagsText
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => [t, existingTagColors.get(t) || null])
    saveField("tags", { tags: newTags })
  }

  /**
   * Pie-slicing value save — rewrites the `50cook` / `100usd` tags in place,
   * preserving every other tag and its color. The Taiga story stays the
   * record; GovKit's sync parses the tags with no backend change. Cash is
   * required at the form level (the editor always passes a number, 0 counts
   * as set) because the backend treats missing cash as 0.
   */
  function saveValue(team: number | null, cash: number) {
    const tags = setValueTags(fullStory.tags, { teamValue: team, cashValue: cash })
    saveField("tags", { tags })
  }

  async function postComment() {
    const text = newComment.trim()
    if (!text || isPostingComment) return
    setIsPostingComment(true)
    setCommentError("")

    // Routed through the query mutation layer so the sync indicator and
    // inspector register the write (offline queueing + retries apply too).
    updateStory.mutate(
      { id: fullStory.id, data: { comment: text, version: fullStory.version } },
      {
        onSuccess: (updated) => {
          setFullStory(updated)
          onUpdate(updated)
          setNewComment("")

          // Taiga's history feed lags a beat behind the write, so the comment
          // shows from the optimistic pending list; the invalidated comments
          // query replaces it with the server's entry as soon as it lands.
          const pending: HistoryEntry = {
            id: `pending-${updated.version}`,
            user: {
              pk: me?.id ?? 0,
              username: me?.username ?? "",
              name: me?.full_name || me?.username || "you",
              photo: null,
              is_active: true,
            },
            created_at: new Date().toISOString(),
            comment: text,
            comment_html: "",
            delete_comment_date: null,
            delete_comment_user: null,
            type: 1,
            values_diff: {},
          } as unknown as HistoryEntry
          setPendingComments((old) => [...old, pending])
          queryClient.invalidateQueries({ queryKey: qk.comments(story.id) })
        },
        onError: (err) => {
          console.error("Failed to post comment:", err)
          setCommentError((err as Error).message)
        },
        onSettled: () => setIsPostingComment(false),
      },
    )
  }

  // --- Comment actions (edit / delete / restore / permalink) ---

  const allComments = [
    ...(comments ?? []),
    ...pendingComments.filter(
      (p) =>
        !(comments ?? []).some(
          (c) => c.comment.trim() === p.comment.trim() && c.user.pk === p.user.pk,
        ),
    ),
  ]

  // Deleted comments vanish for everyone except whoever can restore them
  // (the author or a project admin) — deleted means gone, recovery stays
  // discoverable only for those who can act.
  const visibleComments = allComments.filter((c) => {
    if (c.delete_comment_date == null) return true
    const deleter = c.delete_comment_user as { pk?: number } | null
    return deleter?.pk === me?.id || c.user.pk === me?.id || canModerate
  })

  function startEditComment(entry: HistoryEntry) {
    setEditingCommentId(String(entry.id))
    setEditCommentText(entry.comment)
  }

  function saveEditComment() {
    if (!editingCommentId) return
    const trimmed = editCommentText.trim()
    if (!trimmed) return
    editCommentMutation.mutate(
      { entryId: editingCommentId, comment: trimmed },
      {
        onError: (err) => toast.error(`Failed to edit comment: ${(err as Error).message}`),
      },
    )
    setEditingCommentId(null)
  }

  function handleDeleteComment(entry: HistoryEntry) {
    const entryId = String(entry.id)
    deleteCommentMutation.mutate(
      { entryId },
      { onError: (err) => toast.error(`Failed to delete comment: ${(err as Error).message}`) },
    )
    toast("Comment deleted", {
      action: {
        label: "Undo",
        onClick: () =>
          undeleteCommentMutation.mutate(
            { entryId },
            { onError: (err) => toast.error(`Failed to restore comment: ${(err as Error).message}`) },
          ),
      },
    })
  }

  function handleRestoreComment(entry: HistoryEntry) {
    undeleteCommentMutation.mutate(
      { entryId: String(entry.id) },
      { onError: (err) => toast.error(`Failed to restore comment: ${(err as Error).message}`) },
    )
  }

  async function copyCommentLink(entry: HistoryEntry) {
    const url = new URL(window.location.href)
    url.searchParams.set("comment", String(entry.id))
    await copyToClipboard(url.toString(), "Comment link copied to clipboard")
  }

  // Taiga comments are flat, so a "reply" is a normal comment that @mentions
  // the author and block-quotes their words — no backend change needed.
  // The @mention only notifies project members, matching Taiga's own rule.
  function replyToComment(entry: HistoryEntry) {
    const prefix = buildQuoteReply(entry.user.username, entry.comment, entry.user.name)
    setNewComment((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${prefix}` : prefix))
    requestAnimationFrame(() => {
      const composer = document.querySelector(
        '[aria-label="New comment"]',
      ) as HTMLTextAreaElement | null
      composer?.scrollIntoView({ behavior: "smooth", block: "center" })
      composer?.focus()
      composer?.setSelectionRange(composer.value.length, composer.value.length)
    })
  }

  // --- Attachments ---
  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files)
    if (list.length === 0) return
    setUploadingNames((old) => [...old, ...list.map((f) => f.name)])
    for (const file of list) {
      try {
        const created = await uploadStoryAttachment(story.id, fullStory.project, file)
        setAttachments((old) => [...old, created])
        setAttachmentError("")
      } catch (err) {
        setAttachmentError(`${file.name}: ${(err as Error).message}`)
      } finally {
        setUploadingNames((old) => old.filter((n) => n !== file.name))
      }
    }
  }

  async function removeAttachment(a: Attachment) {
    const prev = attachments
    setAttachments((old) => old.filter((x) => x.id !== a.id))
    if (openAttachmentId === a.id) setOpenAttachmentId(null)
    try {
      await deleteStoryAttachment(a.id)
    } catch (err) {
      setAttachments(prev)
      setAttachmentError(`${a.name}: ${(err as Error).message}`)
    }
  }

  async function toggleAttachment(a: Attachment) {
    if (openAttachmentId === a.id) {
      setOpenAttachmentId(null)
      return
    }
    setOpenAttachmentId(a.id)
    if (!isPreviewableText(a) || previewText[a.id] !== undefined) return
    try {
      const blob = await api.getBlob(a.url)
      const text = await blob.text()
      setPreviewText((old) => ({ ...old, [a.id]: text }))
    } catch (err) {
      // Media lives on the Taiga host; if it does not allow this origin the
      // browser blocks the read. The download link still works.
      setPreviewError((old) => ({ ...old, [a.id]: (err as Error).message }))
    }
  }

  function uploaderName(a: Attachment): string {
    if (a.owner === fullStory.owner) {
      return fullStory.owner_extra_info?.full_name_display || ""
    }
    const member = members.find((m) => m.id === a.owner)
    return member?.full_name || member?.username || ""
  }

  async function handleShare() {
    await copyToClipboard(window.location.href, "Link copied to clipboard")
  }

  async function handleDuplicate() {
    if (fullStory.assigned_to) {
      toast.error("Only unassigned stories can be duplicated.")
      return
    }
    try {
      const { createUserStory } = await import("@/lib/api/userstories")
      const copy = await createUserStory({
        project: fullStory.project,
        subject: fullStory.subject + " (copy)",
        status: fullStory.status,
        description: fullStory.description || "",
      })
      if (fullStory.tags && fullStory.tags.length > 0) {
        await updateUserStory(copy.id, { tags: fullStory.tags, version: copy.version })
      }
      onUpdate(copy)
      onClose()
    } catch (err) {
      toast.error(`Failed to duplicate: ${(err as Error).message}`)
    }
  }

  async function handleDelete() {
    if (isDeleting) return
    setIsDeleting(true)
    onDelete(fullStory.id)
    try {
      await api.delete(`/userstories/${fullStory.id}`)
    } catch (err) {
      toast.error(`Failed to delete: ${(err as Error).message}`)
    }
  }

  function getStatus(statusId: number): UserStoryStatus | undefined {
    return statuses.find((s) => s.id === statusId)
  }

  const statusInfo = getStatus(fullStory.status)

  return (
    <div className="flex h-full flex-col">
      {/* Header groups live in the app toolbar via portals — back/ref/nav/status
          after the sidebar toggle, actions at the far right. */}
      {breadcrumbEl &&
        createPortal(
          <div className="flex min-w-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon" onClick={onClose} aria-label="Back (Esc)" />
                }
              >
                <ArrowLeft className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">Back (Esc)</TooltipContent>
            </Tooltip>
            <span className="text-muted-foreground shrink-0 font-mono text-sm">#{fullStory.ref}</span>

            {/* Prev/next from the server's neighbors chain — no list walk */}
            {onNavigateRef && fullStory.neighbors && (
              <span className="flex shrink-0 items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={!fullStory.neighbors.previous}
                        onClick={() => fullStory.neighbors?.previous && onNavigateRef(fullStory.neighbors.previous.ref)}
                        aria-label="Previous story"
                      />
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {fullStory.neighbors.previous ? `#${fullStory.neighbors.previous.ref} ${fullStory.neighbors.previous.subject}` : "No previous story"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={!fullStory.neighbors.next}
                        onClick={() => fullStory.neighbors?.next && onNavigateRef(fullStory.neighbors.next.ref)}
                        aria-label="Next story"
                      />
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {fullStory.neighbors.next ? `#${fullStory.neighbors.next.ref} ${fullStory.neighbors.next.subject}` : "No next story"}
                  </TooltipContent>
                </Tooltip>
              </span>
            )}
          </div>,
          breadcrumbEl,
        )}

      {actionsEl &&
        createPortal(
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant={editingAll ? "secondary" : "ghost"}
                    size="icon"
                    onClick={toggleEditAll}
                    aria-label={editingAll ? "Stop editing" : "Edit all fields"}
                  />
                }
              >
                <Pencil className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">{editingAll ? "Stop editing" : "Edit all fields"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDuplicate}
                    disabled={!!fullStory.assigned_to}
                    aria-label="Duplicate"
                  />
                }
              >
                <Copy className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {fullStory.assigned_to ? "Only unassigned stories can be duplicated" : "Duplicate"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Share" />
                }
              >
                <Share2 className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">Copy link</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="hover:text-destructive"
                    aria-label="Delete"
                  />
                }
              >
                <Trash2 className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">Delete</TooltipContent>
            </Tooltip>
          </div>,
          actionsEl,
        )}

      {/* Blocked banner — from the server's is_blocked + blocked_note */}
      {fullStory.is_blocked && (
        <div className="flex shrink-0 items-center gap-2 border-b bg-amber-500/10 px-6 py-2 text-sm text-amber-600 dark:text-amber-400">
          <OctagonAlert className="h-4 w-4 shrink-0" />
          <span className="font-medium">Blocked</span>
          {fullStory.blocked_note && <span className="truncate">— {fullStory.blocked_note}</span>}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
          {/* Title */}
          {isEditing("subject") ? (
            <Input
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              onBlur={saveSubject}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur()
                if (e.key === "Escape") setEditingField(null)
              }}
              className="border-primary/50 h-auto border-b-2 bg-transparent px-0 py-1 text-2xl font-semibold focus-visible:ring-0 focus-visible:border-primary"
              autoFocus
            />
          ) : (
            <h1
              className="-mx-1 cursor-text rounded px-1 py-1 text-2xl font-semibold transition-colors hover:bg-accent/60"
              onClick={() => startEdit("subject")}
            >
              {fullStory.subject}
            </h1>
          )}

          {fullStory.epics && fullStory.epics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {fullStory.epics.map((epic) => (
                <span
                  key={epic.id}
                  className="rounded px-2 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${epic.color}20`, color: epic.color }}
                >
                  {epic.subject}
                </span>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Status */}
            {isEditing("status") ? (
              <StoryStatusSelect
                projectId={fullStory.project}
                value={fullStory.status}
                onValueChange={(statusId) => {
                  saveStatus(statusId)
                  if (!editingAll) setEditingField(null)
                }}
                defaultOpen
                triggerClassName="h-8 w-44"
              />
            ) : (
              <button
                onClick={() => startEdit("status")}
                className="hover:bg-accent -mx-2 flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors"
                title="Click to change status"
              >
                <span
                  className="rounded px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${statusInfo?.color || "#666"}30`,
                    color: statusInfo?.color || "#666",
                  }}
                >
                  {statusInfo?.name || "Unknown"}
                </span>
              </button>
            )}

            {/* Assignee */}
            {isEditing("assignee") ? (
              <AssigneeSelect
                projectId={fullStory.project}
                value={fullStory.assigned_to ?? null}
                onValueChange={(userId) => {
                  saveAssignee(userId)
                  if (!editingAll) setEditingField(null)
                }}
                defaultOpen
                triggerClassName="h-8 w-44"
              />
            ) : (
              <button
                onClick={() => startEdit("assignee")}
                className="text-muted-foreground hover:bg-accent -mx-2 flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors"
                title="Click to change assignee"
              >
                <UserIcon className="h-4 w-4" />
                {fullStory.assigned_to_extra_info ? (
                  <span>{fullStory.assigned_to_extra_info.full_name_display}</span>
                ) : (
                  <span className="text-muted-foreground/70">Unassigned</span>
                )}
              </button>
            )}

            {/* Creator (read-only) */}
            {fullStory.owner_extra_info && (
              <div className="text-muted-foreground flex items-center gap-2 px-2 py-1" title="Created by">
                <Avatar name={fullStory.owner_extra_info.full_name_display || fullStory.owner_extra_info.username} size="sm" />
                <span>{fullStory.owner_extra_info.full_name_display || fullStory.owner_extra_info.username}</span>
              </div>
            )}

            {/* Points */}
            {isEditing("points") && project ? (
              <PointsSelect
                project={project}
                value={currentPointId}
                onValueChange={(pointId) => {
                  savePoints(pointId)
                  if (!editingAll) setEditingField(null)
                }}
                defaultOpen
                triggerClassName="h-8 w-40"
              />
            ) : project ? (
              <button
                onClick={() => startEdit("points")}
                className="text-muted-foreground hover:bg-accent -mx-2 flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors"
                title="Click to estimate"
              >
                {currentPointName ? (
                  <span className="text-primary font-medium">{currentPointName} points</span>
                ) : (
                  <span className="text-muted-foreground/70">No estimate</span>
                )}
              </button>
            ) : fullStory.total_points !== null && fullStory.total_points !== undefined ? (
              <div className="text-muted-foreground flex items-center gap-2 px-2 py-1">
                <span className="text-primary font-medium">{fullStory.total_points} points</span>
              </div>
            ) : null}

            {/* Pie-slicing value (team cook + cash usd tags) */}
            {isEditing("value") ? (
              <ValueEditor
                initialTeam={parseTeamValue(fullStory.tags)}
                initialCash={parseCashValue(fullStory.tags)}
                onSave={(team, cash) => saveValue(team, cash)}
                onCancel={() => {
                  if (!editingAll) setEditingField(null)
                }}
              />
            ) : (
              <button
                onClick={() => startEdit("value")}
                className="text-muted-foreground hover:bg-accent -mx-2 flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors"
                title="Click to set pie-slicing value"
              >
                <ValueBadge story={fullStory} />
              </button>
            )}

            {/* Due date */}
            {isEditing("due_date") ? (
              <div className="flex items-center gap-2">
                <DatePicker
                  value={parseISODateString(editDueDate)}
                  onChange={(d) => {
                    const v = d ? toISODateString(d) : ""
                    setEditDueDate(v)
                    // The calendar commits on select — no blur step like the text input had.
                    // saveField stays open in edit-all mode, so this is safe unconditionally.
                    saveField("due_date", { due_date: v || null })
                  }}
                  placeholder="Pick a due date"
                  ariaLabel="Due date"
                />
                {editDueDate && !editingAll && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => saveField("due_date", { due_date: null })}
                  >
                    Clear
                  </Button>
                )}
              </div>
            ) : (
              <button
                onClick={() => startEdit("due_date")}
                className={`hover:bg-accent -mx-2 flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors ${
                  fullStory.due_date_status === "past_due"
                    ? "text-destructive"
                    : fullStory.due_date_status === "near"
                      ? "text-amber-500"
                      : "text-muted-foreground"
                }`}
                title="Click to set due date"
              >
                <Calendar className="h-4 w-4" />
                {fullStory.due_date ? (
                  <span className="font-medium">
                    Due {new Date(fullStory.due_date + "T00:00:00").toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-muted-foreground/70">Set due date</span>
                )}
              </button>
            )}

            {milestones.length > 0 ? (
              <div className="text-muted-foreground flex items-center gap-2 px-2 py-1" title="Sprint">
                <Clock className="h-4 w-4 shrink-0" />
                <TaskSprintSelector
                  sprints={milestones}
                  value={fullStory.milestone}
                  onChange={(milestoneId) => saveSprint(milestoneId)}
                />
              </div>
            ) : (
              fullStory.milestone_name && (
                <div className="text-muted-foreground flex items-center gap-2 px-2 py-1">
                  <Clock className="h-4 w-4" />
                  <span>{fullStory.milestone_name}</span>
                </div>
              )
            )}
          </div>

          {/* Tags */}
          {isEditing("tags") ? (
            <Input
              value={editTagsText}
              onChange={(e) => setEditTagsText(e.target.value)}
              onBlur={saveTags}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur()
                if (e.key === "Escape") setEditingField(null)
              }}
              placeholder="bug, feature, urgent (comma separated)"
              autoFocus
            />
          ) : (
            <div
              className="-mx-1 flex min-h-8 cursor-text flex-wrap gap-2 rounded px-1 py-1 transition-colors hover:bg-accent/60"
              onClick={() => startEdit("tags")}
              title="Click to edit labels"
            >
              {fullStory.tags && fullStory.tags.length > 0 ? (
                fullStory.tags.map(([tag, color]) => (
                  <span
                    key={tag}
                    className="bg-accent rounded px-2 py-1 text-xs"
                    style={color ? { backgroundColor: `${color}20`, color } : undefined}
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground/70 text-sm italic">Add labels...</span>
              )}
            </div>
          )}

          {/* Description */}
          <div className="border-t pt-4">
            <h3 className="text-muted-foreground mb-2 text-sm font-medium">Description</h3>
            {isEditing("description") ? (
              <>
                <MarkdownEditor
                  value={editDescription}
                  onChange={setEditDescription}
                  onBlur={saveDescription}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingField(null)
                  }}
                  rows={12}
                  placeholder="Add a description... (type @ to mention a project member)"
                  autoFocus
                  ariaLabel="Story description"
                  mentionable={mentionable}
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Click outside or press Esc to save · Markdown supported
                </p>
              </>
            ) : (
              <div
                className="-mx-2 min-h-12 cursor-text rounded px-2 py-2 transition-colors hover:bg-accent/60"
                onClick={() => startEdit("description")}
                title="Click to edit"
              >
                {fullStory.description ? (
                  <Markdown source={fullStory.description} projectSlug={fullStory.project_extra_info.slug} />
                ) : (
                  <span className="text-muted-foreground/70 italic">Click to add a description...</span>
                )}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div
            className="border-t pt-4"
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragOver(false)
              if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files)
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-muted-foreground text-sm font-medium">
                Attachments{attachments.length ? ` (${attachments.length})` : ""}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                Add file
              </Button>
              <input ref={fileInput} type="file" multiple className="sr-only" onChange={(e) => {
                if (e.target.files) uploadFiles(e.target.files)
                e.target.value = ""
              }} />
            </div>

            {attachmentError && <p className="text-destructive mb-2 text-sm">{attachmentError}</p>}

            <div className={`rounded-md border border-dashed transition-colors ${isDragOver ? "border-primary bg-primary/5" : ""}`}>
              {attachments.length === 0 && uploadingNames.length === 0 ? (
                <button
                  onClick={() => fileInput.current?.click()}
                  className="text-muted-foreground hover:text-foreground w-full px-3 py-6 text-sm transition-colors"
                >
                  Drop a file here, or click to choose one. Markdown, images, documents.
                </button>
              ) : (
                <ul className="divide-y">
                  {attachments.map((a) => (
                    <li key={a.id}>
                      <div className="flex items-center gap-3 px-3 py-2">
                        <button
                          onClick={() => toggleAttachment(a)}
                          className="group min-w-0 flex-1 text-left"
                          title={isPreviewableText(a) || isImage(a) ? "Click to preview" : "File"}
                        >
                          <span className="group-hover:text-primary block truncate text-sm">{a.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {formatFileSize(a.size)}
                            {uploaderName(a) && ` · ${uploaderName(a)}`} · {formatRelative(a.created_date)}
                          </span>
                        </button>
                        <a
                          href={a.url}
                          download={a.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:bg-accent hover:text-foreground shrink-0 rounded p-1.5 transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => removeAttachment(a)}
                          className="text-muted-foreground hover:bg-accent hover:text-destructive shrink-0 rounded p-1.5 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {openAttachmentId === a.id && (
                        <div className="px-3 pb-3">
                          {isImage(a) ? (
                            <img src={a.url} alt={a.name} className="max-w-full rounded border" />
                          ) : previewError[a.id] ? (
                            <p className="text-muted-foreground text-sm">
                              Cannot show this file inline.{" "}
                              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                Open it
                              </a>
                              .
                            </p>
                          ) : previewText[a.id] === undefined ? (
                            <p className="text-muted-foreground text-sm">
                              {isPreviewableText(a) ? "Loading preview..." : "No inline preview for this file type."}
                            </p>
                          ) : isMarkdown(a) ? (
                            <Markdown
                              source={previewText[a.id]}
                              className="bg-accent/40 overflow-x-auto rounded border p-4"
                            />
                          ) : (
                            <pre className="bg-accent/40 overflow-x-auto whitespace-pre-wrap rounded border p-3 text-xs">
                              {previewText[a.id]}
                            </pre>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                  {uploadingNames.map((name) => (
                    <li key={name} className="text-muted-foreground flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="flex-1 truncate">{name}</span>
                      <span className="text-xs">Uploading...</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="border-t pt-4">
            <h3 className="text-muted-foreground mb-3 text-sm font-medium">Comments</h3>
            <div className="mb-4 flex items-end gap-2">
              <MarkdownEditor
                value={newComment}
                onChange={setNewComment}
                rows={4}
                placeholder="Add a comment... (type @ to mention a project member)"
                ariaLabel="New comment"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment()
                }}
                className="flex-1"
                mentionable={mentionable}
              />
              <Button
                onClick={postComment}
                disabled={!newComment.trim() || isPostingComment}
                className="shrink-0"
              >
                {isPostingComment ? "..." : "Post"}
              </Button>
            </div>
            {commentError && (
              <p className="text-destructive mb-4 text-sm">{commentError} — nothing you typed was lost.</p>
            )}
            {!commentsLoading ? (
              visibleComments.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No comments yet</p>
              ) : (
                <div id="comments-section" className="space-y-3">
                  {visibleComments.map((comment) => {
                    const commentId = String(comment.id)
                    const isPending = commentId.startsWith("pending-")
                    const isDeleted = comment.delete_comment_date != null
                    const isMine = comment.user.pk === me?.id
                    const isEditingThis = editingCommentId === commentId
                    const isHighlighted = highlightId != null && commentId === highlightId
                    const deleter = comment.delete_comment_user as { pk?: number; name?: string } | null
                    const canRestore = isDeleted && (deleter?.pk === me?.id || isMine || canModerate)
                    // Authors manage their own comments; project admins manage anyone's.
                    const canManage = !isPending && !isDeleted && (isMine || canModerate)

                    return (
                      <div
                        key={commentId}
                        id={isPending ? undefined : `comment-${commentId}`}
                        className={cn(
                          "group -mx-2 flex gap-3 rounded-md p-2 transition-colors",
                          isHighlighted && "bg-primary/5 ring-ring/40 ring-2",
                        )}
                      >
                        <Avatar name={comment.user.name} photo={comment.user.photo} size="sm" className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-center gap-2">
                            <Link
                              to={memberPath(fullStory.project_extra_info.slug, comment.user.username) as never}
                              className="truncate text-sm font-medium hover:text-primary hover:underline"
                              title={`View ${comment.user.username}'s profile`}
                            >
                              {comment.user.name}
                            </Link>
                            <span className="text-muted-foreground text-xs">{formatRelative(comment.created_at)}</span>
                            {comment.edit_comment_date && !isDeleted && (
                              <span className="text-muted-foreground/70 text-xs">(edited)</span>
                            )}

                            <div className="ml-auto flex items-center gap-0.5">
                              {!isPending && !isDeleted && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() => replyToComment(comment)}
                                          aria-label={`Reply to ${comment.user.name}`}
                                        />
                                      }
                                    >
                                      <Reply className="h-3.5 w-3.5" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Reply (quote + mention)</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() => copyCommentLink(comment)}
                                          aria-label="Copy comment link"
                                        />
                                      }
                                    >
                                      <Link2 className="h-3.5 w-3.5" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Copy link</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                              {canManage && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() => startEditComment(comment)}
                                          aria-label="Edit comment"
                                        />
                                      }
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Edit</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() => setConfirmDeleteEntry(comment)}
                                          className="hover:text-destructive"
                                          aria-label="Delete comment"
                                        />
                                      }
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Delete</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </div>

                          {isDeleted ? (
                            <div className="flex items-center gap-3">
                              <p className="text-muted-foreground text-sm italic">
                                Comment deleted
                                {deleter?.name ? ` by ${deleter.name}` : ""}
                                {comment.delete_comment_date ? ` · ${formatRelative(comment.delete_comment_date)}` : ""}
                              </p>
                              {canRestore && (
                                <Button variant="ghost" size="sm" onClick={() => handleRestoreComment(comment)}>
                                  Restore
                                </Button>
                              )}
                            </div>
                          ) : isEditingThis ? (
                            <div className="space-y-2">
                              <MarkdownEditor
                                value={editCommentText}
                                onChange={setEditCommentText}
                                rows={4}
                                ariaLabel="Edit comment"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEditComment()
                                }}
                                mentionable={mentionable}
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => setEditingCommentId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={saveEditComment}
                                  disabled={!editCommentText.trim()}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Markdown
                              source={comment.comment}
                              projectSlug={fullStory.project_extra_info.slug}
                              className="text-muted-foreground break-words [&>*:first-child]:mt-0"
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              <p className="text-muted-foreground text-sm">Loading comments...</p>
            )}
          </div>

          <div className="text-muted-foreground border-t pt-4 text-xs">
            <div className="flex flex-wrap gap-4">
              <span>
                Created
                {fullStory.owner_extra_info && (
                  <>
                    {" "}by <span className="font-medium">{fullStory.owner_extra_info.full_name_display || fullStory.owner_extra_info.username}</span>
                  </>
                )}{" "}
                on {new Date(fullStory.created_date).toLocaleDateString()}
              </span>
              <span>Updated: {new Date(fullStory.modified_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Issue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>#{fullStory.ref}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete comment confirmation — Undo stays available via toast after confirm */}
      <AlertDialog
        open={confirmDeleteEntry != null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteEntry(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the comment by{" "}
              <strong>{confirmDeleteEntry?.user.name ?? "this user"}</strong>? You can undo
              right after from the toast.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteEntry) handleDeleteComment(confirmDeleteEntry)
                setConfirmDeleteEntry(null)
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
