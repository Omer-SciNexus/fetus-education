import { useState } from 'react'
import { useParams } from 'react-router'
import { useSamples } from '@/lib/queries'
import { guest } from '@/lib/guest'
import { stageLabels } from '@/lib/stage'
import { ActivityView, ItemCard } from '@/features/activities/ActivityView'
import { Button, ButtonLink, Card, EmptyState, ErrorState, LoadingState, Notice, PageHeader } from '@/components/ui'
import type { Stage } from '@/types/db'

function GuestNotice() {
  return (
    <Notice tone="info">
      You are trying Little Bloom as a guest. Progress is kept only in this browser tab and is not saved to an
      account.
    </Notice>
  )
}

export default function SamplePage() {
  const samples = useSamples()
  const [stage, setStage] = useState<Stage | null>(guest.get().stage)
  const completed = new Set(guest.get().completed)

  const choose = (s: Stage | null) => {
    guest.setStage(s)
    setStage(s)
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader title="Try an activity" subtitle="Three sample activities from the 14-activity program." />
      <GuestNotice />

      <Card>
        <h2 className="font-bold">Stage (optional)</h2>
        <p className="text-sm text-ink-soft">Only used to label content. You can skip this.</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Pregnancy stage">
          {(['first', 'second', 'third'] as Stage[]).map((s) => (
            <Button key={s} variant={stage === s ? 'primary' : 'secondary'} aria-pressed={stage === s} onClick={() => choose(s)}>
              {stageLabels[s]}
            </Button>
          ))}
          <Button variant={stage === null ? 'primary' : 'secondary'} aria-pressed={stage === null} onClick={() => choose(null)}>
            Skip
          </Button>
        </div>
      </Card>

      {samples.isPending ? (
        <LoadingState />
      ) : samples.isError ? (
        <ErrorState error={samples.error} onRetry={() => void samples.refetch()} />
      ) : (
        (() => {
          const activities = samples.data.filter((i) => i.kind === 'activity')
          if (!activities.length) return <EmptyState title="No samples are available right now." />
          return (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activities.map((i) => (
                <ItemCard key={i.id} item={i} to={`/sample/${i.slug}`} done={completed.has(i.slug)} />
              ))}
            </ul>
          )
        })()
      )}
    </div>
  )
}

export function SampleActivityPage() {
  const { slug = '' } = useParams()
  const samples = useSamples()
  const [done, setDone] = useState(() => guest.get().completed.includes(slug))

  if (samples.isPending) return <LoadingState />
  if (samples.isError) return <ErrorState error={samples.error} onRetry={() => void samples.refetch()} />
  const item = samples.data.find((i) => i.slug === slug)
  if (!item) {
    return (
      <div className="py-8">
        <EmptyState title="This sample is not available." action={<ButtonLink to="/sample">See samples</ButtonLink>} />
      </div>
    )
  }
  const others = samples.data.filter((i) => i.kind === 'activity' && i.slug !== slug)

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <GuestNotice />
      <ActivityView
        item={item}
        showTogether={false}
        actions={
          done ? (
            <Card className="bg-peach-50">
              <h2 className="text-lg font-bold">Nicely done.</h2>
              <p className="mt-1 text-ink-soft">
                Sign in to save progress and keep memories. Guest progress stays in this tab only.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {others[0] && <ButtonLink to={`/sample/${others[0].slug}`}>Try another sample</ButtonLink>}
                <ButtonLink to="/sign-in" variant="secondary">Sign in to save</ButtonLink>
                <Button
                  variant="ghost"
                  onClick={() => {
                    guest.uncomplete(slug)
                    setDone(false)
                  }}
                >
                  Undo
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              full
              onClick={() => {
                guest.complete(slug)
                setDone(true)
              }}
            >
              Mark as done
            </Button>
          )
        }
      />
    </div>
  )
}
