import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useItem } from '@/lib/queries'
import { getReviewSummary } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { Badge, ButtonLink, Card, EmptyState, ErrorState, LoadingState, Notice } from '@/components/ui'
import { PlaceholderBanner } from '@/features/activities/ActivityView'

export default function LearnPage() {
  const { slug = '' } = useParams()
  const item = useItem(slug)
  const versionId = item.data?.version.id
  const reviews = useQuery({
    queryKey: ['reviews', versionId],
    queryFn: () => getReviewSummary(versionId!),
    enabled: !!versionId,
  })

  if (item.isPending) return <LoadingState />
  if (item.isError) return <ErrorState error={item.error} onRetry={() => void item.refetch()} />
  if (!item.data || item.data.kind !== 'education') {
    return <EmptyState title="This card is not available." action={<ButtonLink to="/explore?f=learn">See all cards</ButtonLink>} />
  }
  const v = item.data.version

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge tone="sage">Learn</Badge>
          {v.health_related && <Badge>Health information</Badge>}
        </div>
        <h1 className="text-3xl font-bold">{v.title}</h1>
        {v.summary && <p className="text-lg text-ink-soft">{v.summary}</p>}
      </header>

      {v.is_placeholder && <PlaceholderBanner />}

      <Card>
        <p className="prose-lb">{v.body}</p>
      </Card>

      <Notice tone="info">
        This card is general information, not advice about your own pregnancy. Ask your care provider about your
        situation.
      </Notice>

      <section className="space-y-2 text-sm">
        <h2 className="text-base font-bold">About this card</h2>
        {reviews.data && reviews.data.length > 0 ? (
          <ul className="space-y-1">
            {reviews.data.map((r, i) => (
              <li key={i}>
                {r.review_type === 'clinical' ? 'Clinical review' : 'Editorial review'} by {r.reviewer_name},{' '}
                {formatDate(r.reviewed_at)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-soft">No review has been recorded for this version yet.</p>
        )}
        {v.published_at && <p className="text-ink-soft">Published {formatDate(v.published_at)} · version {v.version}</p>}
        {item.data.sources.length > 0 && (
          <>
            <h3 className="pt-2 font-bold">Sources</h3>
            <ul className="list-disc space-y-1 pl-5">
              {item.data.sources.map((s) => (
                <li key={s.id}>
                  <a className="text-peach-700 underline" href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>{' '}
                  <span className="text-ink-soft">(accessed {s.accessed_on})</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </article>
  )
}
