import { useState } from 'react'
import { useParams } from 'react-router'
import { useSamples } from '@/lib/queries'
import { guest } from '@/lib/guest'
import { stageLabels } from '@/lib/stage'
import { ActivityView, ItemCard } from '@/features/activities/ActivityView'
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  Pills,
} from '@/components/ui'
import { Artwork } from '@/components/Artwork'
import { Icon } from '@/components/Icon'
import type { Stage } from '@/types/db'

function GuestNotice() {
  return (
    <Notice tone="info">
      You are trying Little Bloom as a guest. Progress is kept only in this browser tab and is not saved to an
      account.
    </Notice>
  )
}

const stageOptions = [
  { key: 'first', label: stageLabels.first },
  { key: 'second', label: stageLabels.second },
  { key: 'third', label: stageLabels.third },
  { key: 'skip', label: 'Skip' },
] as const

export default function SamplePage() {
  const samples = useSamples()
  const [stage, setStage] = useState<Stage | null>(guest.get().stage)
  const completed = new Set(guest.get().completed)

  const choose = (s: Stage | null) => {
    guest.setStage(s)
    setStage(s)
  }

  return (
    <div className="space-y-6 py-6">
      <div className="sample-intro">
        <div>
          <PageHeader
            title="Try a few activities"
            subtitle="A small beginning. Explore three free samples from the 14-activity program, no account needed."
          />
        </div>
        <Artwork name="page-samples" eager />
      </div>
      <GuestNotice />

      <Card className="stage-picker space-y-3">
        <div>
          <h2 className="font-bold">Stage (optional)</h2>
          <p className="text-sm text-ink-soft">Only used to label content. You can skip this.</p>
        </div>
        <Pills
          label="Pregnancy stage"
          options={stageOptions}
          value={stage ?? 'skip'}
          onChange={(key) => choose(key === 'skip' ? null : key)}
        />
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
            <ul className="library-grid">
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
        <EmptyState
          title="This sample is not available."
          action={<ButtonLink to="/sample">See samples</ButtonLink>}
        />
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
        backTo="/sample"
        actions={
          done ? (
            <Card className="bg-peach-50">
              <h2 className="text-lg font-bold">Nicely done.</h2>
              <p className="mt-1 text-ink-soft">
                Sign in to save progress and keep memories. Guest progress stays in this tab only.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {others[0] && <ButtonLink to={`/sample/${others[0].slug}`}>Try another sample</ButtonLink>}
                <ButtonLink to="/sign-in" variant="secondary">
                  Sign in to save
                </ButtonLink>
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
            <div className="activity-actions">
              <Button
                full
                onClick={() => {
                  guest.complete(slug)
                  setDone(true)
                }}
              >
                <Icon name="heart" size={18} />
                Mark as done
              </Button>
            </div>
          )
        }
      />
    </div>
  )
}
