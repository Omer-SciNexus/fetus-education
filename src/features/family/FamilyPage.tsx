import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth, useMember } from '@/lib/auth'
import { createInvitation, leaveFamily, revokeInvitation, revokePartner, updatePregnancy } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { formatBytes, formatDate, formatDateTime } from '@/lib/format'
import { inviteLink } from '@/lib/navigation'
import { keys, useFamily } from '@/lib/queries'
import {
  Badge,
  Button,
  Card,
  Choice,
  ConfirmDialog,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  TextInput,
} from '@/components/ui'
import { Artwork } from '@/components/Artwork'
import { Icon } from '@/components/Icon'

function Meter({
  label,
  used,
  max,
  format = String,
}: {
  label: string
  used: number
  max: number
  format?: (n: number) => string
}) {
  const pct = Math.min(100, Math.round((used / Math.max(1, max)) * 100))
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-ink-soft">
          {format(used)} of {format(max)}
        </span>
      </div>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-ivory"
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={pct >= 85 ? 'h-full bg-danger' : 'h-full bg-sage-600'} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function FamilyPage() {
  const { ctx } = useMember()
  const { refresh } = useAuth()
  const family = useFamily()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [link, setLink] = useState<{ url: string; expires: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'revoke' | 'leave' | null>(null)

  if (family.isPending) return <LoadingState />
  if (family.isError) return <ErrorState error={family.error} onRetry={() => void family.refetch()} />
  const f = family.data
  if (!f) return <ErrorState error={null} />

  const isOwner = f.my_role === 'owner'
  const partner = f.members.find((m) => m.role === 'partner')
  const owner = f.members.find((m) => m.role === 'owner')

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    setError(null)
    try {
      await fn()
      await qc.invalidateQueries({ queryKey: keys.family })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const invite = () =>
    run('invite', async () => {
      const inv = await createInvitation()
      setLink({ url: inviteLink(window.location.origin, inv.token), expires: inv.expires_at })
      setCopied(false)
    })

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link.url)
      setCopied(true)
    } catch {
      setCopied(false)
      setError('Copy failed. Select the link and copy it manually.')
    }
  }

  const share = async () => {
    if (!link || !navigator.share) return
    try {
      await navigator.share({ title: 'Join me on Little Bloom', url: link.url })
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Your circle" />
      <Artwork name={ctx.profile.content_paused ? 'family-paused' : 'family-circle'} className="circle-hero" eager />
      <div className="circle-intro">
        <h2>{partner || !isOwner ? 'A space for both of you' : 'Share a little moment'}</h2>
        <p>
          {isOwner
            ? 'Invite one partner to join your activities and shared memories.'
            : `You and ${owner?.display_name ?? 'the account owner'} share activities and the memories each of you chooses to share.`}
        </p>
      </div>
      <div className="info-card">
        <span className="icon-tile">
          <Icon name="heart" size={24} />
        </span>
        <div>
          <h3>Private memories stay private</h3>
          <p>
            You choose what to share.{' '}
            {isOwner
              ? 'You cannot see your partner’s private entries.'
              : `${owner?.display_name ?? 'The owner'} cannot see your private entries.`}
          </p>
        </div>
      </div>

      {params.get('welcome') && !partner && (
        <div className="mt-4">
          <Notice tone="info">You can invite your partner now, or later from this page.</Notice>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {isOwner && !partner && (
        <section className="invite-card">
          <h2>Invite your partner</h2>
          <p>Share a link to join your circle. It works once and expires after 48 hours.</p>
          <div className="invite-body">
            {link ? (
              <>
                <label htmlFor="invite-link" className="sr-only">
                  Invitation link
                </label>
                <TextInput id="invite-link" readOnly value={link.url} onFocus={(e) => e.target.select()} />
                <Button variant="light" onClick={copy}>
                  <Icon name={copied ? 'check' : 'link'} size={18} />
                  {copied ? 'Copied' : 'Copy invite link'}
                </Button>
                <div className="flex flex-wrap gap-2">
                  {typeof navigator.share === 'function' && (
                    <Button variant="ghost" onClick={share}>
                      Share…
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    loading={busy === 'cancel'}
                    onClick={() =>
                      run('cancel', async () => {
                        await revokeInvitation()
                        setLink(null)
                      })
                    }
                  >
                    Cancel link
                  </Button>
                </div>
                <small>
                  Expires {formatDateTime(link.expires)}. Anyone with this link can join as your partner, so
                  send it only to them. Creating a new link cancels this one.
                </small>
              </>
            ) : f.pending_invitation ? (
              <>
                <p className="notice-light">
                  A link is active until {formatDateTime(f.pending_invitation.expires_at)}. For security we
                  can't show it again — create a new one if you need it.
                </p>
                <Button variant="light" loading={busy === 'invite'} onClick={invite}>
                  <Icon name="link" size={18} />
                  Create new link
                </Button>
                <Button
                  variant="ghost"
                  loading={busy === 'cancel'}
                  onClick={() => run('cancel', revokeInvitation)}
                >
                  Cancel link
                </Button>
              </>
            ) : (
              <Button variant="light" loading={busy === 'invite'} onClick={invite}>
                <Icon name="link" size={18} />
                Create invitation link
              </Button>
            )}
          </div>
        </section>
      )}

      {isOwner && partner && (
        <section className="invite-card">
          <h2>{partner.display_name} is in your circle</h2>
          <p>Joined {formatDate(partner.joined_at)}. Shared memories and activities are visible to both of you.</p>
          <div className="invite-body">
            <Choice
              type="checkbox"
              name="share-preg"
              value="yes"
              checked={!!ctx.pregnancy?.share_with_partner}
              onChange={(on) =>
                void run('share', async () => {
                  await updatePregnancy(f.family_id, { share_with_partner: on })
                  await refresh()
                })
              }
              label="Share pregnancy stage and due date with my partner"
              description="Off by default."
            />
            <Button variant="ghost" onClick={() => setConfirm('revoke')}>
              Remove partner
            </Button>
          </div>
        </section>
      )}

      <section className="manage-access">
        <h2>
          <Icon name="people" size={20} />
          Manage access
        </h2>
        <div className="space-y-4">
          <Card className="space-y-3">
            <h3 className="text-lg font-bold">Members</h3>
            <ul className="space-y-2">
              {f.members.map((m) => (
                <li key={m.role} className="member-row">
                  <span className="font-semibold">
                    {m.display_name} {m.is_me && <span className="font-normal text-ink-soft">(you)</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={m.role === 'owner' ? 'peach' : 'sage'}>
                      {m.role === 'owner' ? 'Account owner' : 'Partner'}
                    </Badge>
                    <span className="text-sm text-ink-soft">since {formatDate(m.joined_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-ink-soft">
              Each person's memories are private unless they mark them as shared.
            </p>
          </Card>

          {!isOwner && (
            <Card className="space-y-3">
              <h3 className="text-lg font-bold">Leave this circle</h3>
              <p className="text-ink-soft">Your memories stay with you, but they will no longer be shared.</p>
              <Button variant="secondary" className="text-danger" onClick={() => setConfirm('leave')}>
                Leave family
              </Button>
            </Card>
          )}

          <Card className="space-y-4">
            <h3 className="text-lg font-bold">Pilot storage</h3>
            <Meter label="Voice recordings" used={f.usage.recordings} max={f.usage.max_recordings} />
            <Meter
              label="Recording space"
              used={f.usage.recording_bytes}
              max={f.usage.max_recording_bytes}
              format={formatBytes}
            />
            <Meter label="Written memories" used={f.usage.text_memories} max={f.usage.max_text_memories} />
            <p className="text-sm text-ink-soft">
              Limits are shared by everyone in the family during the free pilot. Deleting a recording frees
              space.
            </p>
          </Card>
        </div>
      </section>

      <ConfirmDialog
        open={confirm === 'revoke'}
        title="Remove your partner?"
        confirmLabel="Remove partner"
        danger
        busy={busy === 'revoke'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run('revoke', revokePartner).then(() => setConfirm(null))}
      >
        <p>They will immediately lose access to your shared memories and pregnancy details.</p>
        <p>
          Their own memories stay with them and become private. Anything they already downloaded cannot be
          recalled.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'leave'}
        title="Leave this family?"
        confirmLabel="Leave family"
        danger
        busy={busy === 'leave'}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          void run('leave', async () => {
            await leaveFamily()
            await refresh()
          }).then(() => {
            setConfirm(null)
            navigate('/onboarding', { replace: true })
          })
        }
      >
        <p>You will lose access to shared memories. Your own memories stay yours and become private.</p>
        <p>You will need a new invitation to rejoin.</p>
      </ConfirmDialog>
    </div>
  )
}
