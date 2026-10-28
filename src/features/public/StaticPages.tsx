import type { ReactNode } from 'react'
import { ButtonLink, Card, Notice, PageHeader } from '@/components/ui'
import { config } from '@/lib/supabase'

function Doc({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-2xl space-y-6 py-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
}

function DraftNotice() {
  return (
    <Notice tone="warn" title="Draft for the pilot">
      Items in [brackets] must be completed by the project owner — including the operator's identity, the pilot
      country and its applicable privacy law — and reviewed before enrolling participants.
    </Notice>
  )
}

export function HelpPage() {
  return (
    <Doc>
      <PageHeader title="Help" />
      <Notice tone="error" title="If you are worried about your health or your baby">
        Contact your midwife, doctor or maternity unit straight away, or your local emergency number in an
        emergency. Little Bloom cannot assess symptoms or monitor your pregnancy.
      </Notice>

      <h2>Recording a voice memory</h2>
      <ul>
        <li>Your browser asks for microphone permission only when you press Record.</li>
        <li>If permission was refused, allow the microphone for this site in your browser settings, then reload.</li>
        <li>Recordings stop automatically after two minutes.</li>
        <li>Keep the page open until you see <strong>Saved</strong>. If the page closes before that, the recording is lost.</li>
        <li>Recording may stop if your phone locks the screen or you switch apps.</li>
        <li>Please play back any recording you especially want to keep, and download a copy from Settings → Privacy.</li>
      </ul>

      <h2>Partners</h2>
      <ul>
        <li>The account owner creates an invitation link in Family and sends it to their partner themselves.</li>
        <li>Links work once and expire after 48 hours.</li>
        <li>Each person's memories are private unless they choose to share them.</li>
      </ul>

      <h2>Accounts</h2>
      <p>The pilot uses Google sign-in. If you do not have a Google account you can still try the sample activities.</p>

      <h2>Contact</h2>
      <p>
        For product questions, email <a className="text-peach-700 underline" href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a>.
        Please do not email recordings or detailed health information.
      </p>
    </Doc>
  )
}

export function PrivacyPage() {
  return (
    <Doc>
      <PageHeader title="Privacy notice" subtitle={`Version ${config.policyVersion}`} />
      <DraftNotice />

      <h2>Who we are</h2>
      <p>Little Bloom is operated by [operator name, address] for a limited pilot in [country].</p>

      <h2>What we collect</h2>
      <ul>
        <li>Your Google account name, email address and account identifier, used for sign-in.</li>
        <li>Optional pregnancy details you choose to give: a stage or an estimated due date.</li>
        <li>Your preferences, completed activities and favourites.</li>
        <li>Memories you create: text notes and short voice recordings.</li>
        <li>Pseudonymous usage events (for example "activity completed") with no content attached.</li>
      </ul>
      <p>We do not collect medical history, symptoms, precise location, contacts or advertising identifiers.</p>

      <h2>How it is used</h2>
      <p>
        Only to provide the experience you see, to keep it secure, and to understand in aggregate whether the pilot is
        useful. Your pregnancy details only choose which content to show. We do not sell data or show advertising.
      </p>

      <h2>Who can see your data</h2>
      <ul>
        <li>Your memories are visible only to you unless you mark one as shared with your family partner.</li>
        <li>Partners see the owner's pregnancy details only if the owner chooses to share them.</li>
        <li>Content editors cannot browse private memories. Operators may access data only for support or security, and this is limited.</li>
      </ul>

      <h2>Service providers</h2>
      <p>
        Hosting by Cloudflare (website), Supabase (database, sign-in and file storage) and Google (sign-in). Data is
        stored in [Supabase region]. [List data-processing terms and any international transfers.]
      </p>

      <h2>Retention</h2>
      <ul>
        <li>Unsaved recordings stay only in your browser and are discarded when you leave.</li>
        <li>Memories are kept until you delete them or the pilot closes ([closure process]).</li>
        <li>Raw usage events are kept for up to 90 days; afterwards only anonymous totals remain.</li>
        <li>Backups are kept for two weekly generations, so deleted data leaves backups within about two weeks.</li>
      </ul>

      <h2>Your choices and rights</h2>
      <p>
        You can export or delete your data in Settings → Privacy, pause pregnancy content, and revoke partner access.
        Depending on where you live you may have further rights: [applicable law and how to exercise them].
      </p>
      <p>Files you have already downloaded, and calendar reminders you imported, are copies outside Little Bloom that we cannot delete.</p>
    </Doc>
  )
}

export function TermsPage() {
  return (
    <Doc>
      <PageHeader title="Pilot terms" subtitle={`Version ${config.policyVersion}`} />
      <DraftNotice />
      <h2>What the pilot is</h2>
      <p>
        A free, limited trial for up to 25 families to find out whether Little Bloom is useful. Features may change,
        and the pilot may end.
      </p>
      <h2>Not medical care</h2>
      <p>
        Little Bloom provides bonding activities and a memory space. It does not diagnose, monitor or advise on
        pregnancy or fetal health, and makes no claims about effects on a baby's development or intelligence.
      </p>
      <h2>Availability</h2>
      <p>
        The pilot runs on free service tiers with no uptime guarantee. The service may be unavailable at times, and
        up to a week of changes could be lost after a serious incident. Please download memories that matter to you.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Only upload recordings you have the right to share, and do not record other people without their agreement.</li>
        <li>Do not upload copyrighted music recordings.</li>
        <li>Do not attempt to access other families' data.</li>
      </ul>
      <h2>Ending participation</h2>
      <p>You can stop at any time and delete your account from Settings → Privacy.</p>
    </Doc>
  )
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-12">
      <Card>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-ink-soft">This page does not exist or is no longer available.</p>
        <div className="mt-5">
          <ButtonLink to="/">Go home</ButtonLink>
        </div>
      </Card>
    </div>
  )
}
