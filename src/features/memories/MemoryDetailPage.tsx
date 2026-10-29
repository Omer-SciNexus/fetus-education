import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMember } from '@/lib/auth'
import { getMemory, getRecordingForMemory, logEvent, updateMemory } from '@/lib/api'
import { deleteMemory, downloadRecording, extensionForKey } from '@/lib/recordings'
import { errorMessage } from '@/lib/errors'
import { downloadBlob, formatDateTime, formatDuration, safeFilename } from '@/lib/format'
import { keys } from '@/lib/queries'
import { Button, ButtonLink, Card, Choice, ConfirmDialog, EmptyState, ErrorState, Field, LoadingState, Notice, PageHeader, TextArea, TextInput } from '@/components/ui'
import { MemoryBadges } from './MemoriesPage'
import type { Visibility } from '@/types/db'

function VoicePlayer({ objectKey }: { objectKey: string }) {
  const audio = useQuery({
    queryKey: ['audio', objectKey],
    queryFn: () => downloadRecording(objectKey),
    staleTime: Infinity,
    gcTime: 60_000,
  })
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!audio.data) return
    const u = URL.createObjectURL(audio.data)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [audio.data])

  if (audio.isPending) return <LoadingState label="Loading recording…" />
  if (audio.isError) return <ErrorState error={audio.error} title="The recording could not be loaded" onRetry={() => void audio.refetch()} />
  return url ? (
    <audio controls preload="metadata" src={url} className="w-full">
      Your browser cannot play this recording. Use Download instead.
    </audio>
  ) : null
}

export default function MemoryDetailPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { userId } = useMember()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const memory = useQuery({ queryKey: keys.memory(id), queryFn: () => getMemory(id) })
  const recording = useQuery({
    queryKey: keys.recording(id),
    queryFn: () => getRecordingForMemory(id),
    enabled: memory.data?.kind === 'voice',
  })
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logged = useRef(false)

  useEffect(() => {
    if (memory.data && !logged.current && !params.get('saved')) {
      logged.current = true
      void logEvent('memory_revisited')
    }
  }, [memory.data, params])

  if (memory.isPending) return <LoadingState />
  if (memory.isError) return <ErrorState error={memory.error} onRetry={() => void memory.refetch()} />
  const m = memory.data
  if (!m) {
    return <EmptyState title="This memory is not available." action={<ButtonLink to="/memories">All memories</ButtonLink>}>It may have been deleted or is no longer shared with you.</EmptyState>
  }
  const mine = m.author_id === userId

  const startEdit = () => {
    setTitle(m.title)
    setBody(m.body)
    setVisibility(m.visibility)
    setEditing(true)
    setError(null)
  }

  const saveEdit = async () => {
    if (m.kind === 'text' && !body.trim()) return setError('Write something before saving.')
    setBusy(true)
    setError(null)
    try {
      await updateMemory(m.id, { title, body, visibility })
      await qc.invalidateQueries({ queryKey: keys.memory(id) })
      await qc.invalidateQueries({ queryKey: keys.memories })
      setEditing(false)
    } catch (e) {
      setError(errorMessage(e, 'Your changes were not saved.'))
    } finally {
      setBusy(false)
    }
  }

  const doDelete = async () => {
    setBusy(true)
    setError(null)
    try {
      await deleteMemory(m.id)
      await qc.invalidateQueries({ queryKey: keys.memories })
      await qc.invalidateQueries({ queryKey: keys.family })
      navigate('/memories', { replace: true })
    } catch (e) {
      setBusy(false)
      setConfirmDelete(false)
      setError(errorMessage(e, 'Deletion did not finish. Access is already blocked — please try again.'))
      void qc.invalidateQueries({ queryKey: keys.memory(id) })
    }
  }

  const download = async () => {
    const name = safeFilename(m.title || `memory-${m.created_at.slice(0, 10)}`)
    if (m.kind === 'text') {
      downloadBlob(new Blob([`${m.title}\n\n${m.body}\n\n${m.created_at}\n`], { type: 'text/plain;charset=utf-8' }), `${name}.txt`)
      return
    }
    if (!recording.data) return
    try {
      const blob = await downloadRecording(recording.data.object_key)
      downloadBlob(blob, `${name}.${extensionForKey(recording.data.object_key)}`)
    } catch (e) {
      setError(errorMessage(e, 'The download failed. Please try again.'))
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {params.get('saved') && <Notice tone="success" title="Saved." />}
      <PageHeader title={m.title || (m.kind === 'voice' ? 'Voice memory' : 'Memory')} subtitle={formatDateTime(m.created_at)} />
      <MemoryBadges memory={m} mine={mine} />

      {m.state === 'deleting' ? (
        <Notice tone="warn" title="Deletion in progress">
          This memory is hidden and is being removed.
          {mine && (
            <Button variant="secondary" className="mt-3" loading={busy} onClick={doDelete}>
              Finish deleting
            </Button>
          )}
        </Notice>
      ) : editing ? (
        <Card className="space-y-4">
          <Field label="Title">{(p) => <TextInput {...p} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />}</Field>
          <Field label={m.kind === 'text' ? 'Memory' : 'Caption'} hint={`${body.length} / 2000`}>
            {(p) => <TextArea {...p} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} />}
          </Field>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Who can see this?</legend>
            <Choice name="vis" value="private" checked={visibility === 'private'} onChange={() => setVisibility('private')} label="Only me" />
            <Choice name="vis" value="shared" checked={visibility === 'shared'} onChange={() => setVisibility('shared')} label="Share with my family partner" />
          </fieldset>
          {visibility === 'private' && m.visibility === 'shared' && (
            <p className="text-sm text-ink-soft">Unsharing stops future access. Copies your partner already downloaded cannot be recalled.</p>
          )}
          <div className="flex gap-3">
            <Button onClick={saveEdit} loading={busy}>Save changes</Button>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-4">
          {m.kind === 'voice' &&
            (recording.isPending ? (
              <LoadingState />
            ) : recording.data ? (
              <>
                <VoicePlayer objectKey={recording.data.object_key} />
                {recording.data.duration_seconds != null && <p className="text-sm text-ink-soft">{formatDuration(recording.data.duration_seconds)}</p>}
              </>
            ) : (
              <Notice tone="warn">The recording file is unavailable.</Notice>
            ))}
          {m.body && <p className="prose-lb">{m.body}</p>}
        </Card>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {m.state === 'active' && !editing && (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={download}>Download</Button>
          {mine && <Button variant="secondary" onClick={startEdit}>Edit</Button>}
          {mine && <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>Delete</Button>}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this memory?"
        confirmLabel="Delete permanently"
        danger
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={doDelete}
      >
        <p>It will be removed from Little Bloom{m.visibility === 'shared' ? ' for you and your partner' : ''}. This cannot be undone.</p>
        <p>Copies already downloaded are not affected. Backups expire within about two weeks.</p>
      </ConfirmDialog>
    </div>
  )
}
