import { useState } from "react"
import { toast } from "sonner"
import { useNavigate } from "@tanstack/react-router"
import { Cog, CirclePlus } from "lucide-react"
import { Board } from "@/components/app/board/board"
import { CreateStoryDialog } from "@/components/app/create-story-dialog"
import { ColumnEditorDialog } from "@/components/app/column-editor-dialog"
import { IssueModal } from "@/components/app/issue-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProjectStore } from "@/lib/stores/project"
import { useResolvedProject } from "@/lib/queries/projects"
import { useMemberships } from "@/lib/queries/memberships"
import { isArchived, updateProject, unarchiveProject } from "@/lib/api/projects"
import { useSetStoryStatus, useStories, useStatuses } from "@/lib/queries/stories"
import { qk, queryClient } from "@/lib/query"
import type { UserStory } from "@/lib/api/types"

interface BoardPageProps {
  slug: string
  /** The `?story=` deep-link ref, owned by the route. */
  storyRef: number | undefined
  onStoryRefChange: (ref: number | undefined) => void
}

export default function BoardPage({ slug, storyRef, onStoryRefChange }: BoardPageProps) {
  const navigate = useNavigate()
  const { project: currentProject } = useResolvedProject(slug)
  const setProject = useProjectStore((s) => s.setProject)
  const projectId = currentProject?.id ?? null

  const { data: statuses = [], isLoading: statusesLoading } = useStatuses(projectId)
  const { data: stories, isLoading: storiesLoading } = useStories(projectId)
  const { data: memberships } = useMemberships(projectId)
  const setStatus = useSetStoryStatus(projectId ?? 0)

  const [showCreate, setShowCreate] = useState(false)
  const [createStatusId, setCreateStatusId] = useState<number | null>(null)
  const [showColumnEditor, setShowColumnEditor] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState("")

  const members = (memberships ?? []).map((m) => ({
    id: m.user,
    full_name: m.full_name,
    username: m.full_name || "user",
  }))

  const selectedStory: UserStory | null = storyRef
    ? (stories?.find((s) => s.ref === storyRef) ?? null)
    : null

  function handleMoveStory(story: UserStory, newStatusId: number) {
    setStatus.mutate(
      { storyId: story.id, statusId: newStatusId, version: story.version },
      {
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Failed to update story"
          if (msg.toLowerCase().includes("permission")) {
            toast.error("You do not have permission to move stories in this project.")
          } else {
            toast.error(msg)
          }
        },
      }
    )
  }

  async function saveProjectName() {
    if (!editName.trim() || !currentProject) return
    setIsEditingName(false)
    const prevName = currentProject.name
    // Optimistic
    setProject({ ...currentProject, name: editName.trim() })
    try {
      const updated = await updateProject(currentProject.id, { name: editName.trim() })
      setProject(updated)
    } catch (err) {
      setProject({ ...currentProject, name: prevName })
      toast.error(`Failed to rename: ${(err as Error).message}`)
    }
  }

  async function handleUnarchive() {
    if (!currentProject) return
    try {
      const updated = await unarchiveProject(currentProject)
      setProject(updated)
    } catch (err) {
      toast.error(`Failed to unarchive: ${(err as Error).message}`)
    }
  }

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Select a project to view the board</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          {isEditingName ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={saveProjectName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveProjectName()
                if (e.key === "Escape") setIsEditingName(false)
              }}
              className="border-primary/60 h-8 w-64 border-b-2 bg-transparent px-0 font-semibold focus-visible:ring-0"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => {
                setEditName(currentProject.name)
                setIsEditingName(true)
              }}
              className="hover:text-primary cursor-pointer text-lg font-semibold transition-colors"
              title="Click to rename"
            >
              {currentProject.name}
            </h1>
          )}
          <p className="text-muted-foreground text-sm">Kanban Board</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setShowColumnEditor(true)} title="Edit columns">
            <Cog className="h-4 w-4" />
            Columns
          </Button>
          <Button
            onClick={() => {
              setCreateStatusId(null)
              setShowCreate(true)
            }}
          >
            <CirclePlus className="h-4 w-4" />
            New Story
          </Button>
        </div>
      </header>

      {isArchived(currentProject) && (
        <div className="flex items-center justify-between border-b bg-amber-500/10 px-6 py-2 text-sm text-amber-600 dark:text-amber-400">
          <span>This project is archived.</span>
          <Button size="sm" variant="outline" onClick={handleUnarchive}>
            Unarchive
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {statusesLoading || storiesLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading board...</div>
          </div>
        ) : (
          <Board
            statuses={statuses}
            stories={stories ?? []}
            onMoveStory={handleMoveStory}
            onSelect={(story) =>
              navigate({
                to: ".",
                search: { story: story.ref },
                replace: true,
              })
            }
            onAddToColumn={(statusId) => {
              setCreateStatusId(statusId)
              setShowCreate(true)
            }}
          />
        )}
      </div>

      {selectedStory && (
        <IssueModal
          story={selectedStory}
          statuses={statuses}
          members={members}
          onClose={() => onStoryRefChange(undefined)}
          onUpdate={(updated) => {
            queryClient.setQueryData<UserStory[]>(qk.stories(currentProject.id), (old) =>
              old?.map((s) => (s.id === updated.id ? updated : s))
            )
          }}
          onDelete={(id) => {
            onStoryRefChange(undefined)
            queryClient.setQueryData<UserStory[]>(qk.stories(currentProject.id), (old) =>
              old?.filter((s) => s.id !== id)
            )
          }}
        />
      )}

      <CreateStoryDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        projectId={currentProject.id}
        statuses={statuses}
        defaultStatusId={createStatusId}
        members={members}
      />

      <ColumnEditorDialog
        open={showColumnEditor}
        onOpenChange={setShowColumnEditor}
        projectId={currentProject.id}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: qk.statuses(currentProject.id) })
        }}
      />
    </div>
  )
}
