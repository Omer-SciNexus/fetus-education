import { useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router'
import { useMember } from '@/lib/auth'
import { logEvent } from '@/lib/api'
import { useCompletion, useFavorites, useItem, useProgress, useToggleFavorite } from '@/lib/queries'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { Button, ButtonLink, EmptyState, ErrorState, IconButton, LoadingState, Notice } from '@/components/ui'
import { Icon } from '@/components/Icon'
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
    <ActivityView
      item={it}
      showTogether={together}
      paused={ctx.profile.content_paused}
      topAction={
        <IconButton
          icon="bookmark"
          label={isFav ? 'Saved — remove from saved' : 'Save for later'}
          aria-pressed={isFav}
          disabled={fav.isPending}
          onClick={() => fav.mutate({ itemId: it.id, on: !isFav })}
        />
      }
      actions={
        <div className="activity-actions">
          {completedAt ? (
            <Notice tone="success" title="Done">
              You completed this on {formatDate(completedAt)}. You can repeat it any time.
            </Notice>
          ) : null}
          {completion.isError && <Notice tone="error">{errorMessage(completion.error)}</Notice>}
          {fav.isError && <Notice tone="error">{errorMessage(fav.error)}</Notice>}
          {completedAt ? (
            <Button variant="secondary" full loading={completion.isPending} onClick={() => completion.mutate({ itemId: it.id, done: false })}>
              Mark as not done
            </Button>
          ) : (
            <Button full loading={completion.isPending} onClick={() => completion.mutate({ itemId: it.id, done: true })}>
              <Icon name="heart" size={18} />
              Mark as done
            </Button>
          )}
          <ButtonLink to={`/memories/new?activity=${encodeURIComponent(it.slug)}`} variant="secondary" full>
            <Icon name="bookmark" size={18} />
            Save a memory
          </ButtonLink>
        </div>
      }
    />
  )
}
