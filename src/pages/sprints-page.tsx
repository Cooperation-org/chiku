import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/layout/page-state";
import { PagePresence, PageTransition } from "@/components/layout/page-transition";
import { ModuleDisabled } from "@/components/project/module-disabled";
import { SprintCountdownBadge } from "@/components/sprints/sprint-countdown-badge";
import { CreateSprintDialog } from "@/components/sprints/create-sprint-dialog";
import { CloseSprintDialog } from "@/components/sprints/close-sprint-dialog";
import { DeleteSprintDialog } from "@/components/sprints/delete-sprint-dialog";
import { EditSprintDialog } from "@/components/sprints/edit-sprint-dialog";
import { viewEnabled } from "@/lib/project-views";
import { useProjectBySlug } from "@/lib/queries/projects";
import { useStories } from "@/lib/queries/stories";
import { useMilestones, useReopenMilestone } from "@/lib/queries/milestones";
import { backlogStories, openSprintsSorted, rolloverTarget, unfinishedStories } from "@/lib/sprints";
import type { Milestone } from "@/lib/api/types";

function SprintProgress({ sprint }: { sprint: Milestone }) {
  const total = sprint.total_points || 0;
  const closed = sprint.closed_points || 0;
  const pct = total > 0 ? Math.round((closed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 w-32 overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground text-xs tabular-nums">
        {closed}/{total} pts · {pct}%
      </span>
    </div>
  );
}

export default function SprintsPage({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const { project: currentProject } = useProjectBySlug(slug);
  const projectId = currentProject?.id ?? null;
  const { data: milestones, isLoading: sprintsLoading } = useMilestones(projectId);
  const { data: stories, isLoading: storiesLoading } = useStories(projectId);
  const reopen = useReopenMilestone(projectId ?? 0);

  const [showCreate, setShowCreate] = useState(false);
  const [closing, setClosing] = useState<Milestone | null>(null);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [deleting, setDeleting] = useState<Milestone | null>(null);

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">
          {sprintsLoading ? "Loading sprints..." : "Select a project to view sprints"}
        </div>
      </div>
    );
  }

  if (!viewEnabled(currentProject, "sprints")) {
    return <ModuleDisabled view="Sprints" slug={slug} />;
  }

  const sorted = [...(milestones ?? [])].sort(
    (a, b) => +new Date(b.estimated_start) - +new Date(a.estimated_start),
  );
  const backlog = backlogStories(stories ?? []);

  function openBoard(sprintId?: number) {
    navigate({
      to: "/projects/$slug/board",
      params: { slug },
      search: sprintId != null ? { sprint: String(sprintId) } : undefined,
    });
  }

  function handleReopen(sprint: Milestone) {
    reopen.mutate(sprint.id, {
      onSuccess: () => toast.success(`Sprint "${sprint.name}" reopened`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to reopen sprint"),
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Sprints</h1>
              <p className="text-muted-foreground text-sm">
                {backlog.length} {backlog.length === 1 ? "story" : "stories"} waiting in the backlog
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)}>New sprint</Button>
          </div>

          <PagePresence>
            {sprintsLoading || storiesLoading ? (
              <PageLoading key="loading" label="Loading sprints" />
            ) : (
              <PageTransition key="sprints">
                <div className="space-y-4">
                {sorted.map((sprint) => {
                  const unfinished = unfinishedStories(stories ?? [], sprint.id);
                  const target = rolloverTarget(milestones ?? [], sprint.id);
                  return (
                    <div key={sprint.id} className="bg-card rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <h2 className="font-medium">{sprint.name}</h2>
                          <SprintCountdownBadge
                            sprint={sprint}
                            unfinishedCount={unfinished.length}
                            rolloverName={target?.name}
                          />
                        </div>
                        <div className="flex gap-2">
                          {!sprint.closed && (
                            <Button size="sm" variant="outline" onClick={() => openBoard(sprint.id)}>
                              Board
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setEditing(sprint)}>
                            Edit
                          </Button>
                          {sprint.closed ? (
                            <Button size="sm" variant="outline" onClick={() => handleReopen(sprint)}>
                              Reopen
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setClosing(sprint)}>
                              Close…
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(sprint)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                        <SprintProgress sprint={sprint} />
                        <span className="text-muted-foreground text-xs">
                          {new Date(sprint.estimated_start).toLocaleDateString()} →{" "}
                          {new Date(sprint.estimated_finish).toLocaleDateString()}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {unfinished.length} unfinished
                        </span>
                      </div>
                    </div>
                  );
                })}
                {sorted.length === 0 && (
                  <p className="text-muted-foreground py-10 text-center text-sm">
                    No sprints yet — create the first one to start planning.
                  </p>
                )}
                </div>
              </PageTransition>
            )}
          </PagePresence>
        </div>
      </div>

      {currentProject && (
        <CreateSprintDialog open={showCreate} onOpenChange={setShowCreate} projectId={currentProject.id} />
      )}
      {closing && currentProject && (
        <CloseSprintDialog
          open={closing != null}
          onOpenChange={(open) => {
            if (!open) setClosing(null);
          }}
          projectId={currentProject.id}
          sprint={closing}
          unfinished={unfinishedStories(stories ?? [], closing.id)}
          rollover={rolloverTarget(milestones ?? [], closing.id)}
        />
      )}
      {editing && currentProject && (
        <EditSprintDialog
          open={editing != null}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          projectId={currentProject.id}
          sprint={editing}
        />
      )}
      {deleting && currentProject && (
        <DeleteSprintDialog
          open={deleting != null}
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          projectId={currentProject.id}
          sprint={deleting}
          stories={(stories ?? []).filter((s) => s.milestone === deleting.id)}
          destinations={openSprintsSorted(milestones ?? []).filter((m) => m.id !== deleting.id)}
        />
      )}
    </div>
  );
}
