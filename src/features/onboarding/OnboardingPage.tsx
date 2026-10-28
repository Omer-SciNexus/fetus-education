import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '@/lib/auth'
import { completeOnboarding, createFamily } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { peekInviteToken } from '@/lib/navigation'
import { isPlausibleDueDate, stageLabels, estimateStage } from '@/lib/stage'
import { config } from '@/lib/supabase'
import { categoryLabels } from '@/lib/format'
import { Button, ButtonLink, Card, Choice, ErrorState, Field, LoadingState, Notice, PageHeader, TextInput } from '@/components/ui'
import type { Category, Stage } from '@/types/db'

type StageChoice = Stage | 'due_date' | 'skip'
const prefCategories: Category[] = ['story', 'voice', 'calm', 'music', 'family', 'reflect']

export default function OnboardingPage() {
  const { ctx, ctxLoading, ctxError, refresh, signOut, session } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [stageChoice, setStageChoice] = useState<StageChoice>('skip')
  const [dueDate, setDueDate] = useState('')
  const [cats, setCats] = useState<Category[]>([])
  const [mode, setMode] = useState<'solo' | 'shared'>('solo')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialName = ctx?.profile.display_name ?? ''
  useEffect(() => {
    if (initialName) setName((cur) => cur || initialName)
  }, [initialName])

  if (ctxLoading) return <LoadingState />
  if (ctxError || !ctx) return <ErrorState error={ctxError} onRetry={() => void refresh()} />
  if (ctx.membership && ctx.profile.onboarded_at) return <Navigate to="/today" replace />

  // Not yet in a family: invited partners go to /join; others need pilot admission.
  if (!ctx.membership) {
    if (peekInviteToken()) return <Navigate to="/join" replace />
    if (!ctx.admitted) {
      return (
        <div className="mx-auto max-w-lg space-y-5 py-8">
          <PageHeader title="You're not on the pilot list yet" />
          <Notice tone="info">
            <p>
              Little Bloom is in a small private pilot. The account <strong>{session?.user.email}</strong> has not been
              admitted.
            </p>
            <p className="mt-2">
              If you were invited as a partner, open the invitation link you were sent. Otherwise, ask the pilot team to
              add this email address.
            </p>
          </Notice>
          <div className="flex flex-wrap gap-3">
            {ctx.profile.onboarded_at && <ButtonLink to="/memories">Your memories</ButtonLink>}
            <ButtonLink to="/sample" variant={ctx.profile.onboarded_at ? 'secondary' : 'primary'}>Try the samples</ButtonLink>
            <Button variant="secondary" onClick={() => void signOut().then(() => navigate('/'))}>
              Sign out
            </Button>
          </div>
        </div>
      )
    }
  }

  const isOwner = !ctx.membership || ctx.membership.role === 'owner'
  const dueDateError =
    stageChoice === 'due_date' && dueDate && !isPlausibleDueDate(dueDate) ? 'Enter a date within the next 10 months.' : null
  const estimate = stageChoice === 'due_date' && dueDate && !dueDateError ? estimateStage(dueDate) : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!agreed) {
      setError('Please confirm you have read the privacy notice and pilot terms.')
      return
    }
    if (dueDateError) return
    setBusy(true)
    setError(null)
    try {
      if (!ctx.membership) await createFamily()
      await completeOnboarding({
        displayName: name,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
        preferences: { categories: cats, use_mode: isOwner ? mode : 'shared' },
        stage: isOwner && stageChoice !== 'skip' && stageChoice !== 'due_date' ? stageChoice : null,
        dueDate: isOwner && stageChoice === 'due_date' && dueDate ? dueDate : null,
        policyVersion: config.policyVersion,
      })
      await refresh()
      navigate(isOwner && mode === 'shared' ? '/family?welcome=1' : '/today', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl py-6">
      <PageHeader
        title={isOwner ? 'Welcome to Little Bloom' : 'Welcome, partner'}
        subtitle="A few optional questions. You can change everything later in Settings."
      />
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Card className="space-y-4">
          <Field label="What should we call you?" hint="Optional. Shown to your family partner.">
            {(p) => <TextInput {...p} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />}
          </Field>
        </Card>

        {isOwner && (
          <Card className="space-y-3">
            <fieldset className="space-y-2">
              <legend className="font-semibold">Pregnancy stage (optional)</legend>
              <p className="text-sm text-ink-soft">Only used to choose suitable content. Never required.</p>
              {(['first', 'second', 'third'] as Stage[]).map((s) => (
                <Choice key={s} name="stage" value={s} checked={stageChoice === s} onChange={() => setStageChoice(s)} label={stageLabels[s]} />
              ))}
              <Choice name="stage" value="due_date" checked={stageChoice === 'due_date'} onChange={() => setStageChoice('due_date')} label="I'll enter an estimated due date" />
              <Choice name="stage" value="skip" checked={stageChoice === 'skip'} onChange={() => setStageChoice('skip')} label="Prefer not to say" />
            </fieldset>
            {stageChoice === 'due_date' && (
              <Field label="Estimated due date" error={dueDateError} hint={estimate ? `About ${stageLabels[estimate.stage].toLowerCase()} — an estimate you can correct any time.` : undefined}>
                {(p) => <TextInput {...p} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
              </Field>
            )}
          </Card>
        )}

        <Card className="space-y-3">
          <fieldset>
            <legend className="font-semibold">What do you enjoy? (optional)</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {prefCategories.map((c) => (
                <Choice
                  key={c}
                  type="checkbox"
                  name="cats"
                  value={c}
                  checked={cats.includes(c)}
                  onChange={(on) => setCats((cur) => (on ? [...cur, c] : cur.filter((x) => x !== c)))}
                  label={categoryLabels[c]}
                />
              ))}
            </div>
          </fieldset>
        </Card>

        {isOwner && (
          <Card>
            <fieldset className="space-y-2">
              <legend className="font-semibold">How will you use Little Bloom?</legend>
              <Choice name="mode" value="solo" checked={mode === 'solo'} onChange={() => setMode('solo')} label="Mostly on my own" description="Every activity works solo." />
              <Choice name="mode" value="shared" checked={mode === 'shared'} onChange={() => setMode('shared')} label="With a partner" description="You can invite one partner next." />
            </fieldset>
          </Card>
        )}

        <Card>
          <Choice
            type="checkbox"
            name="agree"
            value="yes"
            checked={agreed}
            onChange={setAgreed}
            label="I have read the privacy notice and pilot terms"
            description="Little Bloom is not medical care and makes no claims about a baby's development."
          />
          <p className="mt-2 text-sm">
            <a className="text-peach-700 underline" href="/privacy" target="_blank" rel="noreferrer">Privacy notice</a> ·{' '}
            <a className="text-peach-700 underline" href="/terms" target="_blank" rel="noreferrer">Pilot terms</a>
          </p>
        </Card>

        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" full loading={busy}>
          Continue
        </Button>
      </form>
    </div>
  )
}
