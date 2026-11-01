import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth, useMember } from '@/lib/auth'
import { updatePregnancy, updateProfile } from '@/lib/api'
import { buildReminderIcs, type Weekday } from '@/lib/calendar'
import { errorMessage } from '@/lib/errors'
import { categoryLabels, downloadBlob } from '@/lib/format'
import { estimateStage, isPlausibleDueDate, stageLabels, toDateOnly, todayUtc } from '@/lib/stage'
import { Button, Card, ChoiceChip, Field, Notice, PageHeader, Segmented, TextInput } from '@/components/ui'
import { Icon, type IconName } from '@/components/Icon'
import type { Category, Stage } from '@/types/db'

const prefCategories: { key: Category; icon: IconName }[] = [
  { key: 'story', icon: 'book' },
  { key: 'calm', icon: 'leaf' },
  { key: 'family', icon: 'people' },
  { key: 'voice', icon: 'mic' },
  { key: 'music', icon: 'music' },
  { key: 'reflect', icon: 'pen' },
]
const weekdays: { key: Weekday; label: string }[] = [
  { key: 'MO', label: 'Mon' }, { key: 'TU', label: 'Tue' }, { key: 'WE', label: 'Wed' }, { key: 'TH', label: 'Thu' },
  { key: 'FR', label: 'Fri' }, { key: 'SA', label: 'Sat' }, { key: 'SU', label: 'Sun' },
]

export default function PreferencesPage() {
  const { ctx, userId } = useMember()
  const { refresh } = useAuth()
  const isOwner = ctx.membership?.role === 'owner'

  const [name, setName] = useState(ctx.profile.display_name ?? '')
  const [cats, setCats] = useState<Category[]>(ctx.profile.preferences.categories ?? [])
  const [mode, setMode] = useState<'solo' | 'shared'>(ctx.profile.preferences.use_mode ?? 'solo')
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
    <div className="form-page mx-auto space-y-5">
      <Link to="/settings" className="text-link">
        <Icon name="back" size={16} /> Your space
      </Link>
      <PageHeader
        title={isOwner ? 'Pregnancy preferences' : 'Your preferences'}
        subtitle="Choose what feels right for you. Everything here is optional."
      />
      {saved && <Notice tone="success">{saved}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <Card className="space-y-5">
        <h2 className="text-lg font-bold">About you</h2>
        <Field label="Display name" hint="Shown to your family partner.">
          {(p) => <TextInput {...p} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <fieldset>
          <legend className="font-semibold">What you enjoy</legend>
          <div className="chip-row mt-3">
            {prefCategories.map((c) => (
              <ChoiceChip
                key={c.key}
                icon={c.icon}
                checked={cats.includes(c.key)}
                onChange={(on) => setCats((cur) => (on ? [...cur, c.key] : cur.filter((x) => x !== c.key)))}
                label={categoryLabels[c.key]}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-semibold">Default instructions</legend>
          <div className="mt-3 max-w-sm">
            <Segmented
              label="Default instructions"
              value={mode}
              onChange={setMode}
              options={[
                { key: 'solo', label: 'Solo', icon: 'book' },
                { key: 'shared', label: 'Together', icon: 'people' },
              ]}
            />
          </div>
        </fieldset>
        <Button
          loading={busy === 'profile'}
          onClick={() =>
            run('profile', () => updateProfile(userId, { display_name: name.trim() || null, preferences: { categories: cats, use_mode: mode } }), 'Preferences saved.')
          }
        >
          Save preferences
        </Button>
      </Card>

      {isOwner && ctx.membership && (
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Pregnancy details (optional)</h2>
          <p className="text-sm text-ink-soft">Used only to choose suitable content. Leave blank if you prefer.</p>
          <Field label="Stage">
            {(p) => (
              <select {...p} value={stage} onChange={(e) => setStage(e.target.value as Stage | '')} className="lb-input w-full border px-3.5 py-2.5">
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

      <Card id="reminder" className="space-y-4">
        <h2 className="text-lg font-bold">Quiet moment reminder</h2>
        <p className="text-ink-soft">
          Download a repeating "Quiet moment" event for your own calendar. It contains no pregnancy details. Little
          Bloom cannot change or remove it later — delete it in your calendar app to stop it.
        </p>
        <fieldset>
          <legend className="font-semibold">Days</legend>
          <div className="chip-row mt-3">
            {weekdays.map((d) => (
              <ChoiceChip
                key={d.key}
                checked={days.includes(d.key)}
                onChange={(on) => setDays((cur) => (on ? [...cur, d.key] : cur.filter((x) => x !== d.key)))}
                label={d.label}
              />
            ))}
          </div>
        </fieldset>
        <Field label="Time">{(p) => <TextInput {...p} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="max-w-40" />}</Field>
        <Button variant="secondary" onClick={downloadReminder} disabled={!days.length}>
          <Icon name="download" size={18} />
          Download reminder (.ics)
        </Button>
      </Card>
    </div>
  )
}
