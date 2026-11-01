import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import { useAuth } from './auth'

export const keys = {
  published: ['published'] as const,
  samples: ['samples'] as const,
  item: (slug: string) => ['item', slug] as const,
  progress: ['progress'] as const,
  favorites: ['favorites'] as const,
  memories: ['memories'] as const,
  memory: (id: string) => ['memory', id] as const,
  recording: (memoryId: string) => ['recording', memoryId] as const,
  family: ['family'] as const,
  plan: ['plan'] as const,
}

export function usePlan() {
  return useQuery({ queryKey: keys.plan, queryFn: api.listPlanItems })
}

export function usePublished() {
  const { session } = useAuth()
  return useQuery({ queryKey: [...keys.published, session?.user.id ?? 'guest'], queryFn: api.listPublished })
}

export function useSamples() {
  return useQuery({ queryKey: keys.samples, queryFn: api.listSamples })
}

export function useItem(slug: string) {
  const { session } = useAuth()
  return useQuery({ queryKey: [...keys.item(slug), session?.user.id ?? 'guest'], queryFn: () => api.getPublishedBySlug(slug) })
}

export function useProgress() {
  return useQuery({
    queryKey: keys.progress,
    queryFn: api.listProgress,
    select: (rows) => new Map(rows.map((r) => [r.item_id, r.completed_at])),
  })
}

export function useFavorites() {
  return useQuery({
    queryKey: keys.favorites,
    queryFn: api.listFavorites,
    select: (rows) => new Set(rows.map((r) => r.item_id)),
  })
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: ({ itemId, on }: { itemId: string; on: boolean }) => api.setFavorite(session!.user.id, itemId, on),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.favorites }),
  })
}

export function useCompletion() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) =>
      done ? api.completeActivity(itemId) : api.undoCompletion(session!.user.id, itemId),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.progress }),
  })
}

export function useMemories() {
  return useQuery({ queryKey: keys.memories, queryFn: api.listMemories })
}

export function useFamily() {
  return useQuery({ queryKey: keys.family, queryFn: api.getFamilyOverview })
}
