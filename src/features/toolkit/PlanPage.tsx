import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMember } from '@/lib/auth'
import { addPlanItem, deletePlanItem, setNameHeart, setPlanItemDone, updatePlanItem } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { keys, useFamily, usePlan } from '@/lib/queries'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Notice,
  PageHeader,
  Pills,
  TextInput,
} from '@/components/ui'
import { Icon } from '@/components/Icon'
import type { PlanItem, PlanList, Visibility } from '@/types/db'
import { BackToSpace } from './shared'
import './toolkit.css'

const lists: { key: PlanList; label: string }[] = [
  { key: 'bag', label: 'Hospital bag' },
  { key: 'questions', label: 'Questions' },
  { key: 'names', label: 'Baby names' },
]

const copy: Record<PlanList, { intro: string; field: string; placeholder: string; empty: string }> = {
  bag: {
    intro: 'A packing list you can share. Your hospital or midwife may give you their own list, so check theirs too.',
    field: 'Add something to pack',
    placeholder: 'e.g. Phone charger',
    empty: 'Nothing packed yet. Add your own, or tap an idea above.',
  },
  questions: {
    intro: 'Questions to bring to your next appointment, so nothing gets forgotten.',
    field: 'Add a question',
    placeholder: 'e.g. Which number do I call at night?',
    empty: 'No questions yet. Write them down as they come to you, or tap an idea above.',
  },
  names: {
    intro: 'Collect names you like. Each of you can heart your favourites.',
    field: 'Add a name',
    placeholder: 'e.g. Robin',
    empty: 'No names yet. Add one you like, even just for fun.',
  },
}

// General, non-clinical starter ideas. Hospitals' own lists take priority.
const starters: Partial<Record<PlanList, string[]>> = {
  bag: [
    'Maternity notes and ID',
    'Phone and long charger',
    'Comfortable clothes and socks',
    'Toiletries and lip balm',
    'Snacks and a water bottle',
    'Going-home outfit for baby',
    'Nappies and muslin cloths',
    'Car seat fitted in the car',
  ],
  questions: [
    'When should I call you, and which number do I use at night?',
    'What should I do if I notice a change in my baby’s movements?',
    'What are my options for where to give birth?',
    'Is there anything I should stop or start doing now?',
  ],
}

function isList(v: string | null): v is PlanList {
  return v === 'bag' || v === 'questions' || v === 'names'
}

export default function PlanPage() {
  const { userId } = useMember()
  const qc = useQueryClient()
  const plan = usePlan()
  const family = useFamily()
  const [params, setParams] = useSearchParams()
  const listParam = params.get('list')
  const list: PlanList = isList(listParam) ? listParam : 'bag'
  const hasPartner = (family.data?.members.length ?? 0) > 1

  const [label, setLabel] = useState('')
  const [share, setShare] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PlanItem | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: keys.plan })
  // `patch` updates the cached list straight away so ticks and hearts feel instant;
  // the refetch afterwards restores the server's state if the change failed.
  const run = useMutation({
    mutationFn: ({ fn }: { fn: () => Promise<unknown>; patch?: (items: PlanItem[]) => PlanItem[] }) => fn(),
    onMutate: async ({ patch }) => {
      setError(null)
      if (!patch) return
      await qc.cancelQueries({ queryKey: keys.plan })
      qc.setQueryData<PlanItem[]>(keys.plan, (cur) => (cur ? patch(cur) : cur))
    },
    onError: (e) => setError(errorMessage(e, 'Your change was not saved.')),
    onSettled: refresh,
  })
  const patchItem = (id: string, change: (i: PlanItem) => PlanItem) => (items: PlanItem[]) =>
    items.map((i) => (i.id === id ? change(i) : i))

  const add = (text: string) => {
    const value = text.trim()
    if (!value) {
      setError('Write something before adding it.')
      return
    }
    const visibility: Visibility = share ? 'shared' : 'private'
    run.mutate({ fn: () => addPlanItem({ list, label: value, note: '', visibility }).then(() => setLabel('')) })
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    add(label)
  }

  const items = (plan.data ?? []).filter((i) => i.list === list)
  const existing = new Set(items.map((i) => i.label.toLowerCase()))
  const ideas = (starters[list] ?? []).filter((s) => !existing.has(s.toLowerCase()))
  const doneCount = items.filter((i) => i.done).length
  const c = copy[list]

  return (
    <div className="form-page mx-auto space-y-5">
      <BackToSpace />
      <PageHeader title="Family plan" subtitle="Little lists for the weeks ahead, kept private unless you share them." />
      <Pills
        label="List"
        options={lists}
        value={list}
        onChange={(k) => {
          setError(null)
          setParams({ list: k }, { replace: true })
        }}
      />
      <p className="text-ink-soft">{c.intro}</p>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label={c.field}>
            {(p) => (
              <TextInput
                {...p}
                value={label}
                maxLength={120}
                placeholder={c.placeholder}
                onChange={(e) => setLabel(e.target.value)}
              />
            )}
          </Field>
          <label className="plan-share">
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
            <span>
              Share with my family partner
              <small>{hasPartner ? 'They can see it and tick it off.' : 'No partner yet; they’ll see it if they join.'}</small>
            </span>
          </label>
          <Button type="submit" loading={run.isPending}>
            <Icon name="plus" size={18} /> Add
          </Button>
        </form>
        {ideas.length > 0 && (
          <div className="plan-ideas">
            <p className="text-sm font-semibold">Ideas to add</p>
            <div className="chip-row">
              {ideas.map((idea) => (
                <button key={idea} type="button" className="choice-chip" onClick={() => add(idea)} disabled={run.isPending}>
                  <Icon name="plus" size={14} /> {idea}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {error && <Notice tone="error">{error}</Notice>}

      {plan.isPending ? (
        <LoadingState />
      ) : plan.isError ? (
        <ErrorState error={plan.error} onRetry={() => void plan.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing here yet" art="empty-plan">
          {c.empty}
        </EmptyState>
      ) : (
        <section aria-label={lists.find((l) => l.key === list)!.label}>
          {list !== 'names' && (
            <p className="mb-2 text-sm text-ink-soft">
              {doneCount} of {items.length} {list === 'bag' ? 'packed' : 'answered'}
            </p>
          )}
          <ul className="plan-list">
            {items.map((item) => {
              const mine = item.author_id === userId
              const hearted = item.hearts.some((h) => h.user_id === userId)
              const others = item.hearts.filter((h) => h.user_id !== userId).length
              return (
                <li key={item.id} className={item.done ? 'done' : ''}>
                  {list === 'names' ? (
                    <button
                      type="button"
                      className={`heart-button ${hearted ? 'on' : ''}`}
                      aria-pressed={hearted}
                      aria-label={hearted ? `Remove your heart from ${item.label}` : `Heart ${item.label}`}
                      onClick={() =>
                        run.mutate({
                          fn: () => setNameHeart(userId, item.id, !hearted),
                          patch: patchItem(item.id, (i) => ({
                            ...i,
                            hearts: hearted ? i.hearts.filter((h) => h.user_id !== userId) : [...i.hearts, { user_id: userId }],
                          })),
                        })
                      }
                    >
                      <Icon name="heart" size={20} />
                    </button>
                  ) : (
                    <input
                      type="checkbox"
                      className="plan-check"
                      checked={item.done}
                      aria-label={`${item.label}: ${list === 'bag' ? 'packed' : 'answered'}`}
                      onChange={(e) => {
                        const done = e.target.checked
                        run.mutate({
                          fn: () => setPlanItemDone(item.id, done),
                          patch: patchItem(item.id, (i) => ({ ...i, done })),
                        })
                      }}
                    />
                  )}
                  <span className="plan-label">
                    <span>{item.label}</span>
                    <span className="plan-meta">
                      {mine ? (
                        <Badge tone={item.visibility === 'shared' ? 'sage' : 'neutral'}>
                          {item.visibility === 'shared' ? 'Shared' : 'Only you'}
                        </Badge>
                      ) : (
                        <Badge tone="peach">From your partner</Badge>
                      )}
                      {list === 'names' && others > 0 && (
                        <span className="text-sm text-sage-700">
                          {hearted ? 'You both love this' : 'Your partner loves this'}
                        </span>
                      )}
                    </span>
                  </span>
                  {mine && (
                    <span className="plan-actions">
                      <button
                        type="button"
                        className="text-link text-sm"
                        onClick={() => {
                          const visibility: Visibility = item.visibility === 'shared' ? 'private' : 'shared'
                          run.mutate({
                            fn: () => updatePlanItem(item.id, { visibility }),
                            patch: patchItem(item.id, (i) => ({ ...i, visibility })),
                          })
                        }}
                      >
                        {item.visibility === 'shared' ? 'Make private' : 'Share'}
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Delete ${item.label}`}
                        onClick={() => setDeleting(item)}
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this entry?"
        confirmLabel="Delete"
        danger
        busy={run.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const item = deleting
          if (item) run.mutate({ fn: () => deletePlanItem(item.id).then(() => setDeleting(null)) })
        }}
      >
        <p>“{deleting?.label}” will be removed{deleting?.visibility === 'shared' ? ' for both of you' : ''}.</p>
      </ConfirmDialog>
    </div>
  )
}
