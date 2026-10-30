import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import * as api from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { Badge, Button, Card, Choice, ErrorState, Field, LoadingState, Notice, PageHeader, TextArea, TextInput } from '@/components/ui'
import type { ContentVersion, Stage } from '@/types/db'

const editable = (s: string) => s === 'draft' || s === 'changes_requested'

type Draft = Pick<
  ContentVersion,
  'title' | 'summary' | 'body' | 'solo_steps' | 'together_steps' | 'reflection_prompt' | 'duration_minutes' | 'stages' | 'health_related' | 'is_placeholder' | 'audio_path' | 'transcript' | 'revision_note'
>

function toDraft(v: ContentVersion): Draft {
  return {
    title: v.title, summary: v.summary, body: v.body, solo_steps: v.solo_steps, together_steps: v.together_steps,
    reflection_prompt: v.reflection_prompt, duration_minutes: v.duration_minutes, stages: v.stages,
    health_related: v.health_related, is_placeholder: v.is_placeholder, audio_path: v.audio_path,
    transcript: v.transcript, revision_note: v.revision_note,
  }
}

export default function AdminContentEditor() {
  const { id = '' } = useParams()
  const { hasRole } = useAuth()
  const qc = useQueryClient()
  const item = useQuery({ queryKey: ['admin-item', id], queryFn: () => api.adminGetItem(id) })
  const versions = [...(item.data?.versions ?? [])].sort((a, b) => b.version - a.version)
  const working = versions[0]
  const reviews = useQuery({
    queryKey: ['admin-item-reviews', id, versions.length],
    queryFn: () => api.adminListReviews(versions.map((v) => v.id)),
    enabled: versions.length > 0,
  })
  const sources = useQuery({
    queryKey: ['admin-sources', working?.id],
    queryFn: () => api.adminListSources(working!.id),
    enabled: !!working,
  })

  const [draft, setDraft] = useState<Draft | null>(null)
  const [src, setSrc] = useState({ title: '', url: '' })
  const [reviewNotes, setReviewNotes] = useState('')
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (working) setDraft(toDraft(working))
  }, [working?.id, working?.updated_at]) // eslint-disable-line react-hooks/exhaustive-deps

  if (item.isPending) return <LoadingState />
  if (item.isError) return <ErrorState error={item.error} onRetry={() => void item.refetch()} />
  if (!item.data || !working || !draft) return <ErrorState error={null} title="Item not found" />

  const it = item.data
  const canEdit = hasRole('editor') && editable(working.status)
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['admin-item', id] })
    await qc.invalidateQueries({ queryKey: ['admin-items'] })
    await qc.invalidateQueries({ queryKey: ['admin-item-reviews'] })
    await qc.invalidateQueries({ queryKey: ['admin-sources'] })
    await qc.invalidateQueries({ queryKey: ['published'] })
  }
  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key)
    setMsg(null)
    try {
      await fn()
      await refresh()
      setMsg({ tone: 'success', text: ok })
    } catch (e) {
      setMsg({ tone: 'error', text: errorMessage(e) })
    } finally {
      setBusy(null)
    }
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v })
  const workingReviews = (reviews.data ?? []).filter((r) => r.version_id === working.id)

  return (
    <div className="space-y-5">
      <p><Link to="/admin" className="text-sm font-semibold text-peach-700 underline">← Admin</Link></p>
      <PageHeader
        title={working.title}
        subtitle={<>{it.kind} · {it.category} · /{it.slug}{it.program_position ? ` · program #${it.program_position}` : ''}</>}
      />
      <div className="flex flex-wrap gap-2">
        <Badge tone="peach">v{working.version} · {working.status.replace('_', ' ')}</Badge>
        {it.published_version_id && <Badge tone="sage">Published v{versions.find((v) => v.id === it.published_version_id)?.version}</Badge>}
        {it.withdrawn_at && <Badge tone="danger">Withdrawn</Badge>}
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">Version {working.version}</h2>
        {!canEdit && (
          <Notice tone="info">
            {editable(working.status) ? 'Only editors can change drafts.' : 'This version is locked because it has entered review. Create a new version to make changes.'}
          </Notice>
        )}
        <fieldset disabled={!canEdit} className="space-y-4">
          <Field label="Title">{(p) => <TextInput {...p} value={draft.title} maxLength={120} onChange={(e) => set('title', e.target.value)} />}</Field>
          <Field label="Summary">{(p) => <TextInput {...p} value={draft.summary} maxLength={400} onChange={(e) => set('summary', e.target.value)} />}</Field>
          <Field label="Body / script">{(p) => <TextArea {...p} rows={10} value={draft.body} onChange={(e) => set('body', e.target.value)} />}</Field>
          {it.kind === 'activity' && (
            <>
              <Field label="Solo steps" hint="One step per line.">{(p) => <TextArea {...p} value={draft.solo_steps} onChange={(e) => set('solo_steps', e.target.value)} />}</Field>
              <Field label="Together steps" hint="Optional partner adaptation.">{(p) => <TextArea {...p} value={draft.together_steps} onChange={(e) => set('together_steps', e.target.value)} />}</Field>
              <Field label="Reflection prompt">{(p) => <TextInput {...p} value={draft.reflection_prompt} maxLength={300} onChange={(e) => set('reflection_prompt', e.target.value)} />}</Field>
            </>
          )}
          {(it.kind === 'audio' || draft.audio_path) && (
            <>
              <Field label="Audio path" hint="Public licensed file under /editorial-assets/. Needs a rights record before publishing.">
                {(p) => <TextInput {...p} value={draft.audio_path ?? ''} onChange={(e) => set('audio_path', e.target.value || null)} />}
              </Field>
              <Field label="Transcript">{(p) => <TextArea {...p} value={draft.transcript ?? ''} onChange={(e) => set('transcript', e.target.value || null)} />}</Field>
            </>
          )}
          <Field label="Duration (minutes)">{(p) => <TextInput {...p} type="number" min={1} max={60} value={draft.duration_minutes} onChange={(e) => set('duration_minutes', Number(e.target.value) || 1)} className="max-w-28" />}</Field>
          <fieldset>
            <legend className="font-semibold">Suitable stages (none = all)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['first', 'second', 'third'] as Stage[]).map((s) => (
                <Choice key={s} type="checkbox" name="stages" value={s} checked={draft.stages.includes(s)} onChange={(on) => set('stages', on ? [...draft.stages, s] : draft.stages.filter((x) => x !== s))} label={s} />
              ))}
            </div>
          </fieldset>
          <Choice type="checkbox" name="health" value="1" checked={draft.health_related} onChange={(on) => set('health_related', on)} label="Health-related" description="Requires clinical review and at least one source before publishing." />
          <Choice type="checkbox" name="placeholder" value="1" checked={draft.is_placeholder} onChange={(on) => set('is_placeholder', on)} label="Placeholder (no qualified reviewer yet)" description="Shows a 'not clinically reviewed' banner. Never treat as a reviewed public release." />
          <Field label="Revision note">{(p) => <TextInput {...p} value={draft.revision_note} maxLength={500} onChange={(e) => set('revision_note', e.target.value)} />}</Field>
        </fieldset>
        {canEdit && (
          <div className="flex flex-wrap gap-3">
            <Button loading={busy === 'save'} onClick={() => act('save', () => api.adminUpdateDraft(working.id, draft), 'Draft saved.')}>Save draft</Button>
            <Button variant="secondary" loading={busy === 'submit'} onClick={() => act('submit', async () => { await api.adminUpdateDraft(working.id, draft); await api.adminRpc('admin_submit_for_review', { p_version: working.id }) }, 'Submitted for review.')}>
              Save & submit for review
            </Button>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Sources</h2>
        <ul className="space-y-1 text-sm">
          {(sources.data ?? []).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2">
              <a className="text-peach-700 underline" href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>
              <span className="text-ink-soft">accessed {s.accessed_on}</span>
              {canEdit && <Button variant="ghost" className="min-h-8 py-0 text-sm" onClick={() => act('rm-src', () => api.adminRemoveSource(s.id), 'Source removed.')}>Remove</Button>}
            </li>
          ))}
          {sources.data?.length === 0 && <li className="text-ink-soft">No sources.</li>}
        </ul>
        {canEdit && (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Source title">{(p) => <TextInput {...p} value={src.title} onChange={(e) => setSrc({ ...src, title: e.target.value })} />}</Field>
            <Field label="URL (https)">{(p) => <TextInput {...p} type="url" value={src.url} onChange={(e) => setSrc({ ...src, url: e.target.value })} />}</Field>
            <Button variant="secondary" onClick={() => act('add-src', async () => { await api.adminAddSource(working.id, src.title, src.url); setSrc({ title: '', url: '' }) }, 'Source added.')}>Add</Button>
          </div>
        )}
      </Card>

      {hasRole('reviewer') && working.status === 'in_review' && (
        <Card className="space-y-3">
          <h2 className="text-lg font-bold">Record a review of v{working.version}</h2>
          <p className="text-sm text-ink-soft">
            Approval applies to this exact version. {working.health_related && !working.is_placeholder ? 'Needs editorial AND clinical approval.' : 'Needs editorial approval.'}
          </p>
          <Field label="Notes">{(p) => <TextArea {...p} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} className="min-h-20" />}</Field>
          <div className="flex flex-wrap gap-2">
            {(['editorial', 'clinical'] as const).map((t) => (
              <Button key={t} variant="secondary" loading={busy === `rev-${t}`} onClick={() => act(`rev-${t}`, async () => { await api.adminRpc('admin_record_review', { p_version: working.id, p_type: t, p_result: 'approved', p_notes: reviewNotes }); setReviewNotes('') }, `${t} approval recorded.`)}>
                Approve ({t})
              </Button>
            ))}
            <Button variant="ghost" className="text-danger" loading={busy === 'rev-changes'} onClick={() => act('rev-changes', () => api.adminRpc('admin_record_review', { p_version: working.id, p_type: 'editorial', p_result: 'changes_requested', p_notes: reviewNotes }), 'Changes requested.')}>
              Request changes
            </Button>
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Publishing</h2>
        <div className="flex flex-wrap gap-3">
          {hasRole('publisher') && working.status === 'approved' && (
            <Button loading={busy === 'publish'} onClick={() => act('publish', () => api.adminRpc('admin_publish_version', { p_version: working.id }), 'Published.')}>Publish v{working.version}</Button>
          )}
          {hasRole('publisher') && it.published_version_id && (
            <Button variant="secondary" className="text-danger" loading={busy === 'withdraw'} onClick={() => act('withdraw', () => api.adminRpc('admin_withdraw_item', { p_item: it.id }), 'Withdrawn from users.')}>Withdraw</Button>
          )}
          {hasRole('editor') && !editable(working.status) && working.status !== 'in_review' && working.status !== 'approved' && (
            <Button variant="secondary" loading={busy === 'new'} onClick={() => act('new', () => api.adminRpc('admin_new_version', { p_item: it.id }), 'New draft version created.')}>Create new version</Button>
          )}
        </div>
        <p className="text-sm text-ink-soft">Withdrawing removes the item from recommendations and reading; users' completion history stays, labelled as unavailable.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">History</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {versions.map((v) => (
            <li key={v.id}>
              <strong>v{v.version}</strong> · {v.status.replace('_', ' ')} · updated {formatDateTime(v.updated_at)}
              {v.revision_note && <span className="text-ink-soft"> — {v.revision_note}</span>}
              <ul className="ml-4 list-disc pl-4 text-ink-soft">
                {(reviews.data ?? []).filter((r) => r.version_id === v.id).map((r) => (
                  <li key={r.id}>{r.review_type} {r.result.replace('_', ' ')} · {formatDateTime(r.created_at)}{r.notes && ` — ${r.notes}`}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {workingReviews.length === 0 && working.status === 'in_review' && <p className="mt-2 text-sm text-ink-soft">Awaiting review.</p>}
      </Card>
    </div>
  )
}
