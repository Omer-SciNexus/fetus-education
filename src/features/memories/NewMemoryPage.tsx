import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useMember } from '@/lib/auth'
import { createTextMemory } from '@/lib/api'
import { cleanupStaleUploads } from '@/lib/recordings'
import { errorMessage } from '@/lib/errors'
import { keys, useFamily, useItem } from '@/lib/queries'
import {
  Button,
  ButtonLink,
  Card,
  Choice,
  Field,
  Notice,
  PageHeader,
  TextArea,
  TextInput,
} from '@/components/ui'
import { Icon } from '@/components/Icon'
import { Recorder } from './Recorder'
import { useRecorder } from './useRecorder'
import type { Visibility } from '@/types/db'

const MAX_CHARS = 2000

export default function NewMemoryPage() {
  const { userId } = useMember()
  const [params] = useSearchParams()
  const activitySlug = params.get('activity') ?? ''
  const activity = useItem(activitySlug)
  const family = useFamily()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [kind, setKind] = useState<'text' | 'voice'>(params.get('kind') === 'voice' ? 'voice' : 'text')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorder = useRecorder()

  const activityId = activitySlug ? (activity.data?.id ?? null) : null
  const hasPartner = (family.data?.members.length ?? 0) > 1
  const prompt = activity.data?.version.reflection_prompt

  // Free quota held by uploads interrupted on a previous visit.
  useEffect(() => {
    void cleanupStaleUploads(userId).catch(() => undefined)
  }, [userId])

  useEffect(() => {
    if (recorder.state.status === 'saved') {
      void qc.invalidateQueries({ queryKey: keys.memories })
      void qc.invalidateQueries({ queryKey: keys.family })
    }
  }, [recorder.state.status, qc])

  const saveText = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) {
      setError('Write something before saving.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const id = await createTextMemory({ title, body, visibility, activityId })
      await qc.invalidateQueries({ queryKey: keys.memories })
      navigate(`/memories/${id}?saved=1`, { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Your memory was not saved. Please try again.'))
      setBusy(false)
    }
  }

  if (recorder.state.status === 'saved') {
    return (
      <div className="form-page mx-auto space-y-4">
        <PageHeader title="Saved" />
        <Notice tone="success" title="Your voice memory is saved.">
          It is {visibility === 'shared' ? 'shared with your family partner' : 'private to you'}.
        </Notice>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to={`/memories/${recorder.state.memoryId}`}>Listen</ButtonLink>
          <ButtonLink to="/memories" variant="secondary">
            All memories
          </ButtonLink>
        </div>
      </div>
    )
  }

  const recorderBusy =
    recorder.state.status === 'recording' ||
    recorder.state.status === 'saving' ||
    recorder.state.status === 'recorded' ||
    recorder.state.status === 'failed'

  const visibilityChoices = (
    <fieldset className="space-y-2">
      <legend className="font-semibold">Who can see this?</legend>
      <Choice
        name="vis"
        value="private"
        checked={visibility === 'private'}
        onChange={() => setVisibility('private')}
        label="Only me"
        description="Private — the default."
      />
      <Choice
        name="vis"
        value="shared"
        checked={visibility === 'shared'}
        onChange={() => setVisibility('shared')}
        label="Share with my family partner"
        description={
          hasPartner
            ? 'Your partner will be able to see this.'
            : 'No partner has joined yet; they will see it if they join.'
        }
      />
    </fieldset>
  )

  return (
    <div className="form-page mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/memories" className="icon-button" aria-label="Back to memories">
          <Icon name="back" size={22} />
        </Link>
        <div
          role="tablist"
          aria-label="Memory type"
          className="memory-tabs"
        >
          {(['text', 'voice'] as const).map((k) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={kind === k}
              disabled={recorderBusy && k === 'text'}
              onClick={() => setKind(k)}
            >
              {k === 'text' ? 'Write' : 'Record'}
            </button>
          ))}
        </div>
      </div>
      <PageHeader
        title={kind === 'text' ? 'A little note' : 'A voice memory'}
        subtitle={
          activity.data ? (
            <>
              For:{' '}
              <Link className="underline" to={`/activities/${activitySlug}`}>
                {activity.data.version.title}
              </Link>
            </>
          ) : (
            'A thought, a feeling, a voice. Keep a little piece of today.'
          )
        }
      />
      {prompt && <Notice tone="info">{prompt}</Notice>}

      {kind === 'text' ? (
        <form onSubmit={saveText} className="space-y-5">
          <Card className="space-y-4">
            <Field label="Title (optional)">
              {(p) => (
                <TextInput {...p} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
              )}
            </Field>
            <Field label="Your memory" hint={`${body.length} / ${MAX_CHARS}`}>
              {(p) => (
                <TextArea
                  {...p}
                  value={body}
                  maxLength={MAX_CHARS}
                  rows={7}
                  onChange={(e) => setBody(e.target.value)}
                />
              )}
            </Field>
            {visibilityChoices}
          </Card>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" full loading={busy}>
            Save memory
          </Button>
        </form>
      ) : (
        <>
          <Card>
            <Recorder
              state={recorder.state}
              elapsed={recorder.elapsed}
              onStart={() => void recorder.start()}
              onStop={recorder.stop}
              onDiscard={() => void recorder.discard()}
              onSave={() => void recorder.save({ title, body, visibility, activityId })}
              privacyLabel={visibility === 'shared' ? 'Shared with partner' : 'Only you'}
              shared={visibility === 'shared'}
            />
          </Card>
          <Card className="space-y-4">
            <h2 className="text-lg font-bold">Details</h2>
            <Field label="Title (optional)">
              {(p) => (
                <TextInput {...p} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
              )}
            </Field>
            <Field label="Caption (optional)">
              {(p) => (
                <TextInput {...p} value={body} maxLength={300} onChange={(e) => setBody(e.target.value)} />
              )}
            </Field>
            {visibilityChoices}
          </Card>
        </>
      )}
    </div>
  )
}
