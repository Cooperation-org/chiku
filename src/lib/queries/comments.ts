import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteStoryComment,
  editStoryComment,
  getStoryComments,
  undeleteStoryComment,
} from "@/lib/api/comments"
import { qk } from "@/lib/query"
import type { HistoryEntry } from "@/lib/api/types"

export function useComments(storyId: number | null) {
  return useQuery({
    queryKey: qk.comments(storyId ?? 0),
    queryFn: () => getStoryComments(storyId!),
    enabled: storyId != null,
  })
}

export function useEditStoryComment(storyId: number) {
  const qc = useQueryClient()
  const key = qk.comments(storyId)
  return useMutation({
    mutationFn: ({ entryId, comment }: { entryId: string; comment: string }) =>
      editStoryComment(storyId, entryId, comment),
    onMutate: async ({ entryId, comment }) => {
      const previous = qc.getQueryData<HistoryEntry[]>(key)
      qc.setQueryData<HistoryEntry[]>(key, (old) =>
        old?.map((e) =>
          String(e.id) === entryId
            ? { ...e, comment, edit_comment_date: new Date().toISOString() }
            : e,
        ),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useDeleteStoryComment(storyId: number) {
  const qc = useQueryClient()
  const key = qk.comments(storyId)
  return useMutation({
    mutationFn: ({ entryId }: { entryId: string }) => deleteStoryComment(storyId, entryId),
    onMutate: async ({ entryId }) => {
      const previous = qc.getQueryData<HistoryEntry[]>(key)
      qc.setQueryData<HistoryEntry[]>(key, (old) =>
        old?.map((e) =>
          String(e.id) === entryId
            ? {
                ...e,
                delete_comment_date: new Date().toISOString(),
                delete_comment_user: { pk: e.user.pk, name: e.user.name },
              }
            : e,
        ),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useUndeleteStoryComment(storyId: number) {
  const qc = useQueryClient()
  const key = qk.comments(storyId)
  return useMutation({
    mutationFn: ({ entryId }: { entryId: string }) => undeleteStoryComment(storyId, entryId),
    onMutate: async ({ entryId }) => {
      const previous = qc.getQueryData<HistoryEntry[]>(key)
      qc.setQueryData<HistoryEntry[]>(key, (old) =>
        old?.map((e) =>
          String(e.id) === entryId
            ? { ...e, delete_comment_date: null, delete_comment_user: null }
            : e,
        ),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}
