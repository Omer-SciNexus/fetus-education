import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth, useMember } from '@/lib/auth'
import { exportMyData, listMyRecordings, requestAccountDeletion } from '@/lib/api'
import { downloadRecording, extensionForKey } from '@/lib/recordings'
import { errorCode, errorMessage } from '@/lib/errors'
import { downloadBlob, formatBytes } from '@/lib/format'
import { rememberNext } from '@/lib/navigation'
import { Button, Card, ConfirmDialog, LoadingState, Notice, PageHeader } from '@/components/ui'

export default function PrivacySettingsPage() {
  const { ctx, userId } = useMember()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const recordings = useQuery({ queryKey: ['my-recordings'], queryFn: () => listMyRecordings(userId) })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const isOwner = ctx.membership?.role === 'owner'

  const exportJson = async () => {
    setBusy('export')
    setError(null)
    try {
      const data = await exportMyData()
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `little-bloom-export-${new Date().toISOString().slice(0, 10)}.json`)
    } catch (e) {
      setError(errorMessage(e, 'The export failed. Please try again.'))
    } finally {
      setBusy(null)
    }
  }

  const downloadOne = async (key: string, i: number) => {
    setBusy(key)
    setError(null)
    try {
      const blob = await downloadRecording(key)
      downloadBlob(blob, `little-bloom-recording-${String(i + 1).padStart(2, '0')}.${extensionForKey(key)}`)
    } catch (e) {
      setError(errorMessage(e, 'The download failed.'))
    } finally {
      setBusy(null)
    }
  }

  const deleteAccount = async () => {
    setBusy('delete')
    setError(null)
    try {
      await requestAccountDeletion()
      await signOut()
      navigate('/sign-in?deleted=1', { replace: true })
    } catch (e) {
      setBusy(null)
      setConfirm(false)
      if (errorCode(e) === 'reauth_required') {
        rememberNext('/settings/privacy')
        navigate('/sign-in?reauth=1')
        return
      }
      setError(errorMessage(e, 'Deletion could not be started. Please try again.'))
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Privacy" subtitle="Your data, your choices." />
      {error && <Notice tone="error">{error}</Notice>}

      <Card className="space-y-2">
        <h2 className="text-lg font-bold">How sharing works</h2>
        <ul className="list-disc space-y-1 pl-5 text-ink-soft">
          <li>Every memory is private to its author unless they mark it as shared.</li>
          <li>Shared memories are visible to the current members of your family only.</li>
          <li>Removing a partner, or unsharing a memory, stops future access. Copies already downloaded cannot be recalled.</li>
          <li>Pregnancy details are visible to a partner only if the account owner turns on sharing in Family.</li>
          <li>Content editors cannot browse family memories.</li>
        </ul>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Export your data</h2>
        <p className="text-ink-soft">A JSON file with your profile, progress, favourites and the memories you wrote. Recordings download separately below.</p>
        <Button variant="secondary" loading={busy === 'export'} onClick={exportJson}>Download my data (.json)</Button>

        <h3 className="pt-2 font-bold">Your recordings</h3>
        {recordings.isPending ? (
          <LoadingState />
        ) : recordings.data && recordings.data.length > 0 ? (
          <ul className="space-y-2">
            {recordings.data.map((r, i) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-2">
                <span>Recording {i + 1} · {formatBytes(r.actual_bytes ?? 0)}</span>
                <Button variant="ghost" loading={busy === r.object_key} onClick={() => downloadOne(r.object_key, i)}>Download</Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">You have no saved recordings.</p>
        )}
      </Card>

      <Card className="space-y-3 border-danger/30">
        <h2 className="text-lg font-bold text-danger">Delete your account</h2>
        <p className="text-ink-soft">Please export anything you want to keep first.</p>
        <Button variant="danger" onClick={() => setConfirm(true)}>Delete my account…</Button>
      </Card>

      <ConfirmDialog open={confirm} title="Delete your account?" confirmLabel="Delete everything" danger busy={busy === 'delete'} onCancel={() => setConfirm(false)} onConfirm={deleteAccount}>
        <p>This will permanently:</p>
        <ul className="list-disc pl-5">
          <li>delete your profile, progress, favourites and every memory and recording you created;</li>
          {isOwner ? (
            <li>close your family space. Your partner keeps their own memories privately, but loses access to yours;</li>
          ) : (
            <li>remove you from the family. The owner's memories are not affected;</li>
          )}
          <li>sign you out on this device.</li>
        </ul>
        <p>Files you already downloaded, and calendar reminders you imported, are not affected. Backups expire within about two weeks. You may be asked to sign in again to confirm.</p>
      </ConfirmDialog>
    </div>
  )
}
