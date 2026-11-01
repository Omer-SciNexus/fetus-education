import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth, useMember } from '@/lib/auth'
import * as api from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { formatBytes, formatDateTime } from '@/lib/format'
import { Badge, Button, Card, ErrorState, Field, LoadingState, Notice, PageHeader, TextInput, cx } from '@/components/ui'
import { Icon } from '@/components/Icon'
import type { ContentVersion } from '@/types/db'

type Tab = 'content' | 'pilot' | 'access' | 'rights' | 'ops'

function latest(versions: ContentVersion[]) {
  return [...versions].sort((a, b) => b.version - a.version)[0]
}

const statusTone: Record<string, 'neutral' | 'sage' | 'peach' | 'warn' | 'danger'> = {
  draft: 'neutral',
  in_review: 'peach',
  changes_requested: 'warn',
  approved: 'sage',
  published: 'sage',
  superseded: 'neutral',
  withdrawn: 'danger',
}

function ContentTab() {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const items = useQuery({ queryKey: ['admin-items'], queryFn: api.adminListItems })
  const allVersionIds = (items.data ?? []).flatMap((i) => i.versions.map((v) => v.id))
  const reviews = useQuery({
    queryKey: ['admin-reviews', allVersionIds.length],
    queryFn: () => api.adminListReviews(allVersionIds),
    enabled: !!items.data,
  })
  const [form, setForm] = useState({ slug: '', kind: 'activity', category: 'story', title: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (items.isPending) return <LoadingState />
  if (items.isError) return <ErrorState error={items.error} onRetry={() => void items.refetch()} />

  const reviewed = new Set((reviews.data ?? []).filter((r) => r.result === 'approved' && r.review_type === 'editorial').map((r) => r.version_id))
  const publishedUnreviewed = items.data.filter((i) => {
    const pub = i.versions.find((v) => v.id === i.published_version_id)
    return pub && !reviewed.has(pub.id)
  })
  const placeholders = items.data.filter((i) => i.versions.some((v) => v.id === i.published_version_id && v.is_placeholder))
  const queue = items.data.filter((i) => ['draft', 'in_review', 'changes_requested', 'approved'].includes(latest(i.versions)?.status))

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const id = (await api.adminRpc('admin_create_item', {
        p_slug: form.slug.trim(),
        p_kind: form.kind,
        p_category: form.category,
        p_title: form.title.trim(),
        p_is_sample: false,
        p_program_position: null,
      })) as string
      navigate(`/admin/content/${id}`)
    } catch (err) {
      setError(errorMessage(err, 'Could not create the item. Check the slug is unique and lowercase-with-dashes.'))
      setBusy(false)
    }
  }

  const drafts = items.data.filter((i) => latest(i.versions)?.status === 'draft').length
  const inReview = items.data.filter((i) => ['in_review', 'changes_requested', 'approved'].includes(latest(i.versions)?.status)).length
  const publishedCount = items.data.filter((i) => !!i.published_version_id).length
  const publishedReviewed = publishedCount - publishedUnreviewed.length

  return (
    <div className="space-y-5">
      <div className="stat-tiles">
        <div className="stat-tile blush">
          <span className="icon-tile"><Icon name="pen" size={22} /></span>
          <div><strong>{drafts}</strong><span>drafts</span></div>
        </div>
        <div className="stat-tile sage">
          <span className="icon-tile"><Icon name="clock" size={22} /></span>
          <div><strong>{inReview}</strong><span>in review</span></div>
        </div>
        <div className="stat-tile sand">
          <span className="icon-tile"><Icon name="check" size={22} /></span>
          <div><strong>{publishedCount}</strong><span>published</span></div>
        </div>
      </div>
      {(publishedUnreviewed.length > 0 || placeholders.length > 0) && (
        <Notice tone="warn" title="Release blockers (section 23)">
          {publishedUnreviewed.length > 0 && <p>{publishedUnreviewed.length} published item(s) have no recorded editorial approval.</p>}
          {placeholders.length > 0 && <p>{placeholders.length} published item(s) are placeholder health content awaiting clinical review.</p>}
        </Notice>
      )}

      <div className="admin-grid">
      <div className="space-y-5">
      <Card>
        <h2 className="text-lg font-bold">Review queue</h2>
        {queue.length === 0 ? (
          <p className="mt-2 text-ink-soft">Nothing waiting.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {queue.map((i) => {
              const v = latest(i.versions)
              return (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-2">
                  <Link to={`/admin/content/${i.id}`} className="font-semibold hover:underline">{v.title}</Link>
                  <span className="flex gap-2"><Badge tone={statusTone[v.status]}>{v.status.replace('_', ' ')}</Badge>{v.health_related && <Badge>health</Badge>}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-bold">All content ({items.data.length})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-ink-soft">
              <tr><th className="py-2 pr-3">Title</th><th className="pr-3">Kind</th><th className="pr-3">Latest</th><th className="pr-3">Published</th><th>Flags</th></tr>
            </thead>
            <tbody>
              {items.data.map((i) => {
                const v = latest(i.versions)
                const pub = i.versions.find((x) => x.id === i.published_version_id)
                return (
                  <tr key={i.id} className="border-t border-line">
                    <td className="py-2 pr-3"><Link className="font-semibold hover:underline" to={`/admin/content/${i.id}`}>{v?.title ?? i.slug}</Link></td>
                    <td className="pr-3">{i.kind}{i.program_position ? ` #${i.program_position}` : ''}</td>
                    <td className="pr-3"><Badge tone={statusTone[v?.status ?? 'draft']}>v{v?.version} {v?.status.replace('_', ' ')}</Badge></td>
                    <td className="pr-3">{pub ? `v${pub.version}` : i.withdrawn_at ? 'withdrawn' : '—'}</td>
                    <td className="space-x-1">
                      {i.is_sample && <Badge tone="peach">sample</Badge>}
                      {pub?.is_placeholder && <Badge tone="warn">placeholder</Badge>}
                      {pub && !reviewed.has(pub.id) && <Badge tone="danger">unreviewed</Badge>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {hasRole('editor') && (
        <Card>
          <h2 className="text-lg font-bold">New content item</h2>
          <form onSubmit={create} className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Title">{(p) => <TextInput {...p} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}</Field>
            <Field label="Slug" hint="lowercase-with-dashes">{(p) => <TextInput {...p} required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />}</Field>
            <Field label="Kind">
              {(p) => (
                <select {...p} className="w-full rounded-xl border border-line bg-paper px-3 py-2.5" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  {['activity', 'story', 'audio', 'education'].map((k) => <option key={k}>{k}</option>)}
                </select>
              )}
            </Field>
            <Field label="Category">
              {(p) => (
                <select {...p} className="w-full rounded-xl border border-line bg-paper px-3 py-2.5" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {['voice', 'story', 'calm', 'music', 'family', 'learn', 'reflect'].map((k) => <option key={k}>{k}</option>)}
                </select>
              )}
            </Field>
            {error && <div className="sm:col-span-2"><Notice tone="error">{error}</Notice></div>}
            <div className="sm:col-span-2"><Button type="submit" loading={busy}>Create draft</Button></div>
          </form>
        </Card>
      )}
      </div>
      <Card>
        <h2 className="text-lg font-bold">Before publishing</h2>
        <ul className="checklist">
          <li>
            <span className="check-circle"><Icon name="check" size={18} /></span>
            <div><strong>Sources added</strong><span>Cite the references used for health-related text.</span></div>
          </li>
          <li>
            <span className="check-circle"><Icon name="check" size={18} /></span>
            <div><strong>Rights checked</strong><span>Images, audio and text cleared in the rights register.</span></div>
          </li>
          <li>
            <span className="check-circle"><Icon name="check" size={18} /></span>
            <div>
              <strong>Review recorded</strong>
              <span>
                Editorial approval logged. {publishedReviewed} of {publishedCount} published items have one.
              </span>
            </div>
          </li>
        </ul>
      </Card>
      </div>
    </div>
  )
}

function PilotTab() {
  const report = useQuery({ queryKey: ['pilot-report'], queryFn: () => api.adminRpc('admin_pilot_report') as Promise<Record<string, any>> })
  if (report.isPending) return <LoadingState />
  if (report.isError) return <ErrorState error={report.error} onRetry={() => void report.refetch()} />
  const r = report.data
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—')
  const storagePct = r.storage.active_bytes / r.storage.storage_limit_bytes
  const stats = [
    ['Families enrolled', `${r.families_enrolled} (${r.families_active} active) of ${r.families_max}`],
    ['Activation (48h)', `${r.activated} / ${r.families_enrolled} = ${pct(r.activated, r.families_enrolled)} · target 60%`],
    ['Return use (days 8–14)', `${r.returned_days_8_14} / ${r.activated} = ${pct(r.returned_days_8_14, r.activated)} · target 40% · ${r.eligible_for_return_metric} past day 14`],
    ['Partners accepted / contributed', `${r.partner_invites_accepted} / ${r.partners_contributed}`],
    ['Families with a memory', String(r.families_with_memory)],
    ['Recording storage', `${formatBytes(r.storage.active_bytes)} of 1 GB (${Math.round(storagePct * 100)}%) · ${r.storage.active_recordings} files`],
    ['Uploads: reserved / stale / deleting / failed', `${r.storage.reserved} / ${r.storage.stale_reservations} / ${r.storage.deleting} / ${r.storage.failed}`],
    ['Pending account deletions', String(r.pending_deletions)],
  ]
  return (
    <div className="space-y-5">
      {storagePct >= 0.6 && (
        <Notice tone={storagePct >= 0.85 ? 'error' : 'warn'} title="Storage threshold">
          {storagePct >= 0.85 ? '85%+: consider pausing new uploads.' : storagePct >= 0.75 ? '75%+: stop expanding the pilot.' : '60%+: investigate and update the forecast.'}
        </Notice>
      )}
      <Card>
        <h2 className="text-lg font-bold">Pilot metrics</h2>
        <p className="text-sm text-ink-soft">Generated {formatDateTime(r.generated_at)}. Small numbers — do not present as statistically robust.</p>
        <dl className="mt-3 divide-y divide-line">
          {stats.map(([k, v]) => (
            <div key={k} className="grid gap-1 py-2 sm:grid-cols-[16rem_1fr]"><dt className="font-semibold">{k}</dt><dd className="text-ink-soft">{v}</dd></div>
          ))}
        </dl>
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Events, last 90 days</h2>
        <ul className="mt-2 text-sm">
          {Object.entries(r.events_90d as Record<string, number>).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
          {Object.keys(r.events_90d).length === 0 && <li className="text-ink-soft">No events yet.</li>}
        </ul>
        <p className="mt-2 text-sm text-ink-soft">Egress and database size are not visible here — check the Supabase usage page twice weekly.</p>
      </Card>
    </div>
  )
}

function AccessTab() {
  const { userId } = useMember()
  const qc = useQueryClient()
  const admissions = useQuery({ queryKey: ['admissions'], queryFn: api.adminListAdmissions })
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [roleEmail, setRoleEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null)
    try {
      await fn()
      setMsg({ tone: 'success', text: ok })
      await qc.invalidateQueries({ queryKey: ['admissions'] })
    } catch (e) {
      setMsg({ tone: 'error', text: errorMessage(e) })
    }
  }

  return (
    <div className="space-y-5">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Pilot admissions</h2>
        <p className="text-sm text-ink-soft">Account owners must be listed here. Partners join by invitation and do not need admission.</p>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            void act(() => api.adminAddAdmission(email, note, userId), `Admitted ${email}`).then(() => { setEmail(''); setNote('') })
          }}
        >
          <Field label="Google email">{(p) => <TextInput {...p} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Note (no health details)">{(p) => <TextInput {...p} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
          <Button type="submit">Admit</Button>
        </form>
        {admissions.isPending ? <LoadingState /> : (
          <ul className="divide-y divide-line text-sm">
            {(admissions.data ?? []).map((a) => (
              <li key={a.email} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{a.email} {a.note && <span className="text-ink-soft">— {a.note}</span>}</span>
                <Button variant="ghost" className="min-h-9 py-1 text-sm" onClick={() => void act(() => api.adminRemoveAdmission(a.email), `Removed ${a.email}`)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Roles</h2>
        <p className="text-sm text-ink-soft">Editorial roles never grant access to family memories. The person must have signed in once.</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem] sm:items-end">
          <Field label="Email">{(p) => <TextInput {...p} type="email" value={roleEmail} onChange={(e) => setRoleEmail(e.target.value)} />}</Field>
          <Field label="Role">
            {(p) => (
              <select {...p} className="w-full rounded-xl border border-line bg-paper px-3 py-2.5" value={role} onChange={(e) => setRole(e.target.value)}>
                {['editor', 'reviewer', 'publisher', 'operator'].map((r) => <option key={r}>{r}</option>)}
              </select>
            )}
          </Field>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => void act(() => api.adminRpc('admin_set_role', { p_email: roleEmail, p_role: role, p_grant: true }), `Granted ${role}`)}>Grant</Button>
          <Button variant="secondary" onClick={() => void act(() => api.adminRpc('admin_set_role', { p_email: roleEmail, p_role: role, p_grant: false }), `Revoked ${role}`)}>Revoke</Button>
        </div>
      </Card>
    </div>
  )
}

function RightsTab() {
  const qc = useQueryClient()
  const licenses = useQuery({ queryKey: ['licenses'], queryFn: api.adminListLicenses })
  const empty = { asset_path: '/editorial-assets/', title: '', creator: '', license: '', attribution: '', allowed_uses: '' }
  const [row, setRow] = useState(empty)
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-lg font-bold">Rights register</h2>
        <p className="text-sm text-ink-soft">Every story, illustration and audio file needs a recorded owner or licence. A free download is not automatically licensed for reuse.</p>
        {licenses.isPending ? <LoadingState /> : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {(licenses.data ?? []).map((l) => (
              <li key={l.id} className="py-2"><strong>{l.title}</strong> — {l.asset_path}<br /><span className="text-ink-soft">{l.creator} · {l.license}{l.attribution && ` · ${l.attribution}`}</span></li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Add a rights record</h2>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault()
            setMsg(null)
            try {
              await api.adminAddLicense(row)
              setRow(empty)
              await qc.invalidateQueries({ queryKey: ['licenses'] })
              setMsg('Saved.')
            } catch (err) {
              setMsg(errorMessage(err))
            }
          }}
        >
          {(['asset_path', 'title', 'creator', 'license', 'attribution', 'allowed_uses'] as const).map((k) => (
            <Field key={k} label={k.replace('_', ' ')}>{(p) => <TextInput {...p} required={k !== 'attribution' && k !== 'allowed_uses'} value={row[k]} onChange={(e) => setRow({ ...row, [k]: e.target.value })} />}</Field>
          ))}
          {msg && <p className="sm:col-span-2 text-sm">{msg}</p>}
          <div className="sm:col-span-2"><Button type="submit">Save record</Button></div>
        </form>
      </Card>
    </div>
  )
}

function OpsTab() {
  const audit = useQuery({ queryKey: ['audit'], queryFn: api.adminListAudit })
  const [retention, setRetention] = useState<string | null>(null)
  return (
    <div className="space-y-5">
      <Card className="space-y-2">
        <h2 className="text-lg font-bold">Operating checklist</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li><strong>Daily (early pilot):</strong> review failed saves and pending deletions on the Pilot tab.</li>
          <li><strong>Twice weekly:</strong> check Supabase database size, storage, egress and function usage against free limits.</li>
          <li><strong>Weekly:</strong> run <code>npm run ops:backup</code>, verify counts, keep two encrypted generations.</li>
          <li><strong>Weekly:</strong> run <code>npm run ops:cleanup-uploads</code> and the retention job below.</li>
          <li><strong>Never</strong> enable paid plans, add-ons or spend caps off. Pause uploads/registrations instead.</li>
        </ul>
        <div className="pt-2">
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                const r = await api.adminRpc('admin_run_retention')
                setRetention(JSON.stringify(r))
              } catch (e) {
                setRetention(errorMessage(e))
              }
            }}
          >
            Run retention now
          </Button>
          {retention && <p className="mt-2 text-sm text-ink-soft">{retention}</p>}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Recent admin activity</h2>
        {audit.isPending ? <LoadingState /> : (
          <ul className="mt-2 divide-y divide-line text-sm">
            {(audit.data ?? []).map((a) => (
              <li key={a.id} className="py-1.5">{formatDateTime(a.created_at)} · {a.action} <span className="text-ink-soft">{a.target_id?.slice(0, 8)}</span></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export default function AdminDashboard() {
  const { hasRole } = useAuth()
  const [params, setParams] = useSearchParams()
  const isOperator = hasRole('operator')
  const isEditorial = hasRole('editor') || hasRole('reviewer') || hasRole('publisher')
  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'content', label: 'Content', show: isEditorial },
    { key: 'rights', label: 'Rights', show: isEditorial },
    { key: 'pilot', label: 'Pilot', show: isOperator },
    { key: 'access', label: 'Access', show: isOperator },
    { key: 'ops', label: 'Operations', show: isOperator },
  ]
  const visible = tabs.filter((t) => t.show)
  const tab = (visible.find((t) => t.key === params.get('tab'))?.key ?? visible[0]?.key) as Tab

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Content studio"
        title="Ready for a thoughtful review"
        subtitle="Create and refine content that supports informed, confident and connected parents. Editors never see family memories."
      />
      <div role="tablist" className="pill-group">
        {visible.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setParams({ tab: t.key }, { replace: true })}
            className={cx('pill', tab === t.key && 'active')}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'content' && <ContentTab />}
      {tab === 'rights' && <RightsTab />}
      {tab === 'pilot' && <PilotTab />}
      {tab === 'access' && <AccessTab />}
      {tab === 'ops' && <OpsTab />}
    </div>
  )
}
