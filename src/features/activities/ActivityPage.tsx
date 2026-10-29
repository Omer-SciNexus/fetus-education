import { useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router'
import { useMember } from '@/lib/auth'
import { logEvent } from '@/lib/api'
import { useCompletion, useFavorites, useItem, useProgress, useToggleFavorite } from '@/lib/queries'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { Button, ButtonLink, Card, EmptyState, ErrorState, LoadingState, Notice } from '@/components/ui'
import { ActivityView } from './ActivityView'

export default function ActivityPage() {
  const { slug = '' } = useParams()
  const { ctx } = useMember()
  const item = useItem(slug)
  const progress = useProgress()
  const favorites = useFavorites()
  const completion = useCompletion()
  const fav = useToggleFavorite()
  const logged = useRef(false)

  useEffect(() => {
    if (item.data && !logged.current) {
      logged.current = true
      void logEvent('activity_started')
    }
  }, [item.data])

  if (item.isPending) return <LoadingState />
  if (item.isError) return <ErrorState error={item.error} onRetry={() => void item.refetch()} />
  if (!item.data) {
    // Withdrawn or unpublished: neutral message; completion history is kept.
    return (
      <EmptyState title="This content is no longer available." action={<ButtonLink to="/explore">Back to Explore</ButtonLink>}>
        It may have been updated or withdrawn.
      </EmptyState>
    )
  }
  const it = item.data
  if (it.kind === 'education') return <Navigate to={`/learn/${it.slug}`} replace />

  const completedAt = progress.data?.get(it.id)
  const isFav = !!favorites.data?.has(it.id)
  const together = ctx.profile.preferences.use_mode === 'shared'

  return (
    <div className="mx-auto max-w-2xl">
      <ActivityView
        item={it}
        showTogether={together}
        actions={
          <Card className="space-y-4">
            {completedAt ? (
              <Notice tone="success" title="Done">
                You completed this on {formatDate(completedAt)}. You can repeat it any time.
              </Notice>
            ) : null}
            {completion.isError && <Notice tone="error">{errorMessage(completion.error)}</Notice>}
            <div className="flex flex-wrap gap-3">
              {completedAt ? (
                <Button variant="secondary" loading={completion.isPending} onClick={() => completion.mutate({ itemId: it.id, done: false })}>
                  Mark as not done
                </Button>
              ) : (
                <Button loading={completion.isPending} onClick={() => completion.mutate({ itemId: it.id, done: true })}>
                  Mark as done
                </Button>
              )}
              <ButtonLink to={`/memories/new?activity=${encodeURIComponent(it.slug)}`} variant="secondary">
                Save a memory
              </ButtonLink>
              <Button
                variant="ghost"
                aria-pressed={isFav}
                loading={fav.isPending}
                onClick={() => fav.mutate({ itemId: it.id, on: !isFav })}
              >
                {isFav ? '♥ Favourite' : '♡ Add to favourites'}
              </Button>
            </div>
          </Card>
        }
      />
    </div>
  )
}
