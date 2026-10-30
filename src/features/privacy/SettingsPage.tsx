import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth, useMember } from '@/lib/auth'
import { updatePregnancy, updateProfile } from '@/lib/api'
import { buildReminderIcs, type Weekday } from '@/lib/calendar'
import { errorMessage } from '@/lib/errors'
import { categoryLabels, downloadBlob } from '@/lib/format'
import { estimateStage, isPlausibleDueDate, stageLabels, toDateOnly, todayUtc } from '@/lib/stage'
import { Button, Card, Choice, Field, Notice, PageHeader, TextInput } from '@/components/ui'
import type { Category, Stage } from '@/types/db'

const prefCategories: Category[] = ['story', 'voice', 'calm', 'music', 'family', 'reflect']
const weekdays: { key: Weekday; label: string }[] = [
  { key: 'MO', label: 'Mon' }, { key: 'TU', label: 'Tue' }, { key: 'WE', label: 'Wed' }, { key: 'TH', label: 'Thu' },
  { key: 'FR', label: 'Fri' }, { key: 'SA', label: 'Sat' }, { key: 'SU', label: 'Sun' },
]

export default function SettingsPage() {
  const { ctx, userId } = useMember()
  const { refresh, signOut } = useAuth()
  const navigate = useNavigate()
  const isOwner = ctx.membership?.role === 'owner'

  const [name, setName] = useState(ctx.profile.display_name ?? '')
  const [cats, setCats] = useState<Category[]>(ctx.profile.preferences.categories ?? [])
  const [mode, setMode] = useState(ctx.profile.preferences.use_mode ?? 'solo')
  const [stage, setStage] = useState<Stage | ''>(ctx.pregnancy?.stage ?? '')
  const [dueDate, setDueDate] = useState(ctx.pregnancy?.due_date ?? '')
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [time, setTime] = useState('19:30')
  const [days, setDays] = useState<Weekday[]>(['MO', 'WE', 'FR'])

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key)
    setError(null)
    setSaved(null)
    try {
      await fn()
      await refresh()
      setSaved(msg)
    } catch (e) {
      setError(errorMessage(e, 'Your changes were not saved.'))
    } finally {
      setBusy(null)
    }
  }

  const dueErr = dueDate && !isPlausibleDueDate(dueDate) ? 'Enter a date within the next 10 months.' : null
  const est = dueDate && !dueErr ? estimateStage(dueDate) : null

  const downloadReminder = () => {
    try {
      const ics = buildReminderIcs({ time, days, startDate: toDateOnly(todayUtc()), uid: crypto.randomUUID() })
      downloadBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'quiet-moment.ics')
    } catch {
      setError('Choose at least one day and a valid time.')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="You" subtitle="Preferences, reminders and privacy." />
      {saved && <Notice tone="success">{saved}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">Profile</h2>
        <Field label="Display name">{(p) => <TextInput {...p} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}</Field>
        <fieldset>
          <legend className="font-semibold">What you enjoy</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {prefCategories.map((c) => (
              <Choice key={c} type="checkbox" name="cats" value={c} checked={cats.includes(c)} onChange={(on) => setCats((cur) => (on ? [...cur, c] : cur.filter((x) => x !== c)))} label={categoryLabels[c]} />
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="font-semibold">Default instructions</legend>
          <Choice name="mode" value="solo" checked={mode === 'solo'} onChange={() => setMode('solo')} label="Solo" />
          <Choice name="mode" value="shared" checked={mode === 'shared'} onChange={() => setMode('shared')} label="Together" />
        </fieldset>
        <Button
          loading={busy === 'profile'}
          onClick={() =>
            run('profile', () => updateProfile(userId, { display_name: name.trim() || null, preferences: { categories: cats, use_mode: mode } }), 'Profile saved.')
          }
        >
          Save profile
        </Button>
      </Card>

      {isOwner && ctx.membership && (
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Pregnancy details (optional)</h2>
          <p className="text-sm text-ink-soft">Used only to choose suitable content. Leave blank if you prefer.</p>
          <Field label="Stage">
            {(p) => (
              <select {...p} value={stage} onChange={(e) => setStage(e.target.value as Stage | '')} className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5">
                <option value="">Prefer not to say</option>
                {(['first', 'second', 'third'] as Stage[]).map((s) => <option key={s} value={s}>{stageLabels[s]}</option>)}
              </select>
            )}
          </Field>
          <Field label="Estimated due date" error={dueErr} hint={est ? `Approximately ${stageLabels[est.stage].toLowerCase()} (an estimate). A due date takes priority over the stage above.` : 'Optional.'}>
            {(p) => <TextInput {...p} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button
              loading={busy === 'preg'}
              disabled={!!dueErr}
              onClick={() => run('preg', () => updatePregnancy(ctx.membership!.family_id, { stage: stage || null, due_date: dueDate || null }), 'Pregnancy details saved.')}
            >
              Save details
            </Button>
            <Button variant="ghost" onClick={() => { setStage(''); setDueDate('') }}>Clear</Button>
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Pause pregnancy content</h2>
        <p className="text-ink-soft">
          Pausing removes pregnancy-related suggestions and prompts. Your memories stay exactly as they are. You can
          resume at any time.
        </p>
        <Choice
          type="checkbox"
          name="pause"
          value="yes"
          checked={ctx.profile.content_paused}
          onChange={(on) => void run('pause', () => updateProfile(userId, { content_paused: on }), on ? 'Pregnancy content paused.' : 'Pregnancy content resumed.')}
          label="Pause pregnancy content"
        />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Calendar reminder</h2>
        <p className="text-ink-soft">
          Download a repeating "Quiet moment" event for your own calendar. It contains no pregnancy details. Little
          Bloom cannot change or remove it later — delete it in your calendar app to stop it.
        </p>
        <fieldset>
          <legend className="font-semibold">Days</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {weekdays.map((d) => (
              <Button key={d.key} variant={days.includes(d.key) ? 'primary' : 'secondary'} aria-pressed={days.includes(d.key)} className="min-h-9 px-3 py-1 text-sm" onClick={() => setDays((cur) => (cur.includes(d.key) ? cur.filter((x) => x !== d.key) : [...cur, d.key]))}>
                {d.label}
              </Button>
            ))}
          </div>
        </fieldset>
        <Field label="Time">{(p) => <TextInput {...p} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="max-w-40" />}</Field>
        <Button variant="secondary" onClick={downloadReminder} disabled={!days.length}>Download reminder (.ics)</Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Privacy and account</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/settings/privacy" className="font-semibold text-peach-700 underline">Export or delete your data</Link>
          <Link to="/family" className="font-semibold text-peach-700 underline">Family access</Link>
          <Link to="/help" className="font-semibold text-peach-700 underline">Help</Link>
        </div>
        <Button variant="secondary" onClick={() => void signOut().then(() => navigate('/', { replace: true }))}>Sign out</Button>
      </Card>
    </div>
  )
}
