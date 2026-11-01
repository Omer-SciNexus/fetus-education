import { Link } from 'react-router'
import { useMember } from '@/lib/auth'
import { dailyPrompt, lullabies, talkPrompts } from '@/lib/prompts'
import { ButtonLink, Card, PageHeader } from '@/components/ui'
import { Artwork } from '@/components/Artwork'
import { Icon } from '@/components/Icon'
import { BackToSpace, littleOne } from './shared'
import './toolkit.css'

export function recordPromptLink(prompt: string) {
  return `/memories/new?kind=voice&title=${encodeURIComponent('A little conversation')}&prompt=${encodeURIComponent(prompt)}`
}

export default function TalkPage() {
  const { ctx } = useMember()
  const today = dailyPrompt()
  const who = littleOne(ctx)

  return (
    <div className="form-page mx-auto space-y-5">
      <BackToSpace />
      <PageHeader
        title="Little conversations"
        subtitle={`Simple things to say to ${who}, in your own voice, whenever it suits you.`}
      />

      <Card className="talk-today">
        <Artwork name="conversation" />
        <div>
          <p className="eyebrow">Today’s idea</p>
          <h2>{today}</h2>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to={recordPromptLink(today)}>
              <Icon name="mic" size={18} /> Record it as a memory
            </ButtonLink>
            <ButtonLink
              to={`/memories/new?title=${encodeURIComponent('A little conversation')}&prompt=${encodeURIComponent(today)}`}
              variant="secondary"
            >
              Write it instead
            </ButtonLink>
          </div>
        </div>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-bold">How to do it</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Speak at a normal, comfortable volume, the way you would talk to someone beside you.</li>
          <li>No speakers or headphones on the belly are needed.</li>
          <li>A minute is plenty. Partners, grandparents and friends can join in too.</li>
          <li>There’s no right way, and skipping a day doesn’t matter at all.</li>
        </ul>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">More ideas</h2>
        <ul className="prompt-list">
          {talkPrompts
            .filter((p) => p !== today)
            .map((p) => (
              <li key={p}>
                <span>{p}</span>
                <Link className="icon-button" to={recordPromptLink(p)} aria-label={`Record: ${p}`}>
                  <Icon name="mic" size={18} />
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="songs">
        <h2 id="songs" className="text-xl font-bold">
          Words to sing
        </h2>
        <p className="text-ink-soft">
          Your own voice is what matters, not the tune. Hum, sing or simply read these aloud.
        </p>
        <div className="lullaby-grid">
          {lullabies.map((l) => (
            <Card key={l.slug} className="lullaby">
              <h3>
                <Icon name="music" size={18} /> {l.title}
              </h3>
              <p className="lullaby-lines">
                {l.lines.map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
              </p>
              <p className="text-xs text-ink-soft">{l.origin}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
