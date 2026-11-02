import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '@/lib/auth'
import { completeOnboarding, createFamily } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { peekInviteToken } from '@/lib/navigation'
import { isPlausibleDueDate, stageLabels, estimateStage } from '@/lib/stage'
import { config } from '@/lib/supabase'
import { categoryLabels } from '@/lib/format'
import {
  Button,
  ButtonLink,
  Choice,
  ChoiceChip,
  ErrorState,
  Field,
  LoadingState,
  Logo,
  Notice,
  PageHeader,
  TextInput,
} from '@/components/ui'
import { Artwork } from '@/components/Artwork'
import { Icon, type IconName } from '@/components/Icon'
import type { Category, Stage } from '@/types/db'

type StageChoice = Stage | 'due_date' | 'skip'
type StepKey = 'about' | 'journey' | 'agree'
const prefCategories: { key: Category; icon: IconName }[] = [
  { key: 'story', icon: 'book' },
  { key: 'calm', icon: 'leaf' },
  { key: 'family', icon: 'people' },
  { key: 'voice', icon: 'mic' },
  { key: 'music', icon: 'music' },
  { key: 'reflect', icon: 'pen' },
]

const stepArt: Record<StepKey, string> = { about: 'onboard-about', journey: 'onboard-journey', agree: 'onboard-agree' }

export default function OnboardingPage() {
  const { ctx, ctxLoading, ctxError, refresh, signOut, session } = useAuth()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
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
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [index])

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
              Little Bloom is in a small private pilot. The account <strong>{session?.user.email}</strong> has
              not been admitted.
            </p>
            <p className="mt-2">
              If you were invited as a partner, open the invitation link you were sent. Otherwise, ask the
              pilot team to add this email address.
            </p>
          </Notice>
          <div className="flex flex-wrap gap-3">
            {ctx.profile.onboarded_at && <ButtonLink to="/memories">Your memories</ButtonLink>}
            <ButtonLink to="/sample" variant={ctx.profile.onboarded_at ? 'secondary' : 'primary'}>
              Try the samples
            </ButtonLink>
            <Button variant="secondary" onClick={() => void signOut().then(() => navigate('/'))}>
              Sign out
            </Button>
          </div>
        </div>
      )
    }
  }

  const isOwner = !ctx.membership || ctx.membership.role === 'owner'
  const steps: StepKey[] = isOwner ? ['about', 'journey', 'agree'] : ['about', 'agree']
  const step = steps[Math.min(index, steps.length - 1)]
  const last = index >= steps.length - 1
  const dueDateError =
    stageChoice === 'due_date' && dueDate && !isPlausibleDueDate(dueDate)
      ? 'Enter a date within the next 10 months.'
      : null
  const estimate = stageChoice === 'due_date' && dueDate && !dueDateError ? estimateStage(dueDate) : null

  const next = () => {
    if (step === 'journey' && dueDateError) return
    setError(null)
    setIndex((i) => Math.min(i + 1, steps.length - 1))
  }
  const back = () => {
    setError(null)
    setIndex((i) => Math.max(i - 1, 0))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!last) {
      next()
      return
    }
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

  const titles: Record<StepKey, [string, string]> = {
    about: [
      isOwner ? 'Welcome to Little Bloom' : 'Welcome, partner',
      'Make this space yours. Choose what feels right; you can change this later.',
    ],
    journey: ['A little about your journey', 'Optional, and only used to choose suitable content.'],
    agree: ['Before you begin', 'A quick word about privacy and what Little Bloom is for.'],
  }

  return (
    <div className="onboard">
      <div className="onboard-top">
        <Logo />
        <div className="onboard-steps">
          {index + 1} of {steps.length}
          <div className="onboard-dots" aria-hidden>
            {steps.map((s, i) => (
              <span key={s} className={i <= index ? 'done' : ''} />
            ))}
          </div>
        </div>
      </div>
      <Artwork name={stepArt[step]} className="onboard-art" eager />
      <PageHeader title={titles[step][0]} subtitle={titles[step][1]} />

      <form onSubmit={submit} noValidate>
        {step === 'about' && (
          <div className="space-y-5">
            <Field label="What should we call you?" hint="Optional. Shown to your family partner.">
              {(p) => (
                <TextInput
                  {...p}
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="given-name"
                />
              )}
            </Field>
            {isOwner && (
              <fieldset className="onboard-section">
                <legend>How will you use Little Bloom?</legend>
                <div className="onboard-choices">
                  <Choice
                    name="mode"
                    value="solo"
                    checked={mode === 'solo'}
                    onChange={() => setMode('solo')}
                    label="My pregnancy journey"
                    description="Mostly on my own. Every activity works solo."
                    art="choice-solo"
                  />
                  <Choice
                    name="mode"
                    value="shared"
                    checked={mode === 'shared'}
                    onChange={() => setMode('shared')}
                    label="Together with my partner"
                    description="You can invite one partner next."
                    art="choice-together"
                  />
                </div>
              </fieldset>
            )}
            <fieldset className="onboard-section">
              <legend>I'm also interested in</legend>
              <div className="chip-row">
                {prefCategories.map((c) => (
                  <ChoiceChip
                    key={c.key}
                    icon={c.icon}
                    checked={cats.includes(c.key)}
                    onChange={(on) =>
                      setCats((cur) => (on ? [...cur, c.key] : cur.filter((x) => x !== c.key)))
                    }
                    label={categoryLabels[c.key]}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 'journey' && (
          <div className="space-y-4">
            <fieldset className="onboard-section">
              <legend>Pregnancy stage (optional)</legend>
              <div className="onboard-choices">
                {(['first', 'second', 'third'] as Stage[]).map((s) => (
                  <Choice
                    key={s}
                    name="stage"
                    value={s}
                    checked={stageChoice === s}
                    onChange={() => setStageChoice(s)}
                    label={stageLabels[s]}
                  />
                ))}
                <Choice
                  name="stage"
                  value="due_date"
                  checked={stageChoice === 'due_date'}
                  onChange={() => setStageChoice('due_date')}
                  label="I'll enter an estimated due date"
                />
                <Choice
                  name="stage"
                  value="skip"
                  checked={stageChoice === 'skip'}
                  onChange={() => setStageChoice('skip')}
                  label="Prefer not to say"
                />
              </div>
            </fieldset>
            {stageChoice === 'due_date' && (
              <Field
                label="Estimated due date"
                error={dueDateError}
                hint={
                  estimate
                    ? `About ${stageLabels[estimate.stage].toLowerCase()} — an estimate you can correct any time.`
                    : undefined
                }
              >
                {(p) => (
                  <TextInput
                    {...p}
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                )}
              </Field>
            )}
          </div>
        )}

        {step === 'agree' && (
          <div className="space-y-4">
            <Choice
              type="checkbox"
              name="agree"
              value="yes"
              checked={agreed}
              onChange={setAgreed}
              label="I have read the privacy notice and pilot terms"
              description="Little Bloom is not medical care and makes no claims about a baby's development."
            />
            <p className="text-center text-sm">
              <a className="text-peach-700 underline" href="/privacy" target="_blank" rel="noreferrer">
                Privacy notice
              </a>{' '}
              ·{' '}
              <a className="text-peach-700 underline" href="/terms" target="_blank" rel="noreferrer">
                Pilot terms
              </a>
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        <div className="onboard-actions">
          <Button type="submit" full loading={busy}>
            Continue <Icon name="arrow" size={18} />
          </Button>
          {step === 'journey' ? (
            <button
              type="button"
              className="onboard-skip"
              onClick={() => {
                setStageChoice('skip')
                setDueDate('')
                next()
              }}
            >
              Skip for now
            </button>
          ) : index > 0 ? (
            <button type="button" className="onboard-skip" onClick={back}>
              Back
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
