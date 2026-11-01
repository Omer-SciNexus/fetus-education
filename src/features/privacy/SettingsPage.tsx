import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth, useMember } from '@/lib/auth'
import { updateProfile } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { MenuRow, Notice, PageHeader, Switch } from '@/components/ui'
import { Artwork } from '@/components/Artwork'

export default function SettingsPage() {
  const { ctx, userId } = useMember()
  const { refresh, signOut } = useAuth()
  const navigate = useNavigate()
  const isOwner = ctx.membership?.role === 'owner'
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const togglePause = async (on: boolean) => {
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      await updateProfile(userId, { content_paused: on })
      await refresh()
      setSaved(on ? 'Pregnancy content paused.' : 'Pregnancy content resumed.')
    } catch (e) {
      setError(errorMessage(e, 'Your change was not saved.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-heading">
        <Artwork name="botanical" className="space-art" />
        <PageHeader
          title="Your space"
          subtitle="Tailor your experience, keep your memories safe, and manage your account."
        />
      </div>
      {saved && (
        <div className="mt-4">
          <Notice tone="success">{saved}</Notice>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <section className="settings-group">
        <h2>Your journey</h2>
        <div className="settings-list">
          <MenuRow
            icon="leaf"
            tone="peach"
            title={isOwner ? 'Pregnancy preferences' : 'Your preferences'}
            description="Choose what feels right for you."
            to="/settings/preferences"
          />
          <MenuRow
            icon="pause"
            title="Pause pregnancy content"
            description={ctx.profile.content_paused ? 'Paused. Your memories stay as they are.' : 'Take a break anytime.'}
            control={
              <Switch
                label="Pause pregnancy content"
                checked={ctx.profile.content_paused}
                busy={busy}
                onChange={(on) => void togglePause(on)}
              />
            }
          />
          <MenuRow
            icon="calendar"
            title="Quiet moment reminder"
            description="Add a gentle repeating reminder to your own calendar."
            to="/settings/preferences#reminder"
          />
        </div>
      </section>

      <section className="settings-group">
        <h2>Your memories</h2>
        <div className="settings-list">
          <MenuRow
            icon="image"
            tone="peach"
            title="Export my memories"
            description="Save a copy of what you’ve captured."
            to="/settings/privacy"
          />
          <MenuRow
            icon="people"
            title="Manage shared access"
            description="Choose who can view your memories."
            to="/family"
          />
        </div>
      </section>

      <section className="settings-group">
        <h2>Your account</h2>
        <div className="settings-list">
          <MenuRow
            icon="shield"
            title="Privacy information"
            description="Learn how your data is protected."
            to="/privacy"
          />
          <MenuRow icon="help" title="Help & support" description="Questions, feedback and contact details." to="/help" />
          <MenuRow
            icon="logout"
            title="Sign out"
            description="Log out from this device."
            onClick={() => void signOut().then(() => navigate('/', { replace: true }))}
          />
          <MenuRow
            icon="trash"
            danger
            title="Delete account"
            description="Permanently remove your account and data."
            to="/settings/privacy#delete"
          />
        </div>
      </section>
    </div>
  )
}
