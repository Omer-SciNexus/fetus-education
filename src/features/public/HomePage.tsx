import { Link } from 'react-router'
import { useSamples } from '@/lib/queries'
import { ButtonLink, Chip } from '@/components/ui'
import { Artwork, categoryArt } from '@/components/Artwork'
import { Icon } from '@/components/Icon'

// Shown until the free samples have loaded (or if they cannot be loaded).
const placeholders = [
  { slug: '', image: 'journal', title: 'A note to you', summary: 'Write a short letter to your growing baby.', minutes: 5 },
  { slug: '', image: 'quiet-pause', title: 'Take a breath together', summary: 'A calming exercise to share, anytime.', minutes: 5 },
  { slug: '', image: 'solo-reading', title: 'Notice today', summary: 'Find something small to be grateful for, together.', minutes: 3 },
]

const values = [
  {
    tone: 'blush',
    image: 'solo-reading',
    title: 'Understand',
    text: 'Learn about your changing body, your baby’s development, and what to expect.',
  },
  {
    tone: 'sage',
    image: 'together',
    title: 'Connect',
    text: 'Simple, meaningful activities to feel closer to your baby and each other.',
  },
  {
    tone: 'blush',
    image: 'keepsakes',
    title: 'Remember',
    text: 'Capture the little moments to look back on, always.',
  },
] as const

export default function HomePage() {
  const samples = useSamples()
  const tries = (samples.data ?? [])
    .filter((i) => i.kind === 'activity')
    .slice(0, 3)
    .map((i) => ({
      slug: i.slug,
      image: categoryArt(i.category),
      title: i.version.title,
      summary: i.version.summary,
      minutes: i.version.duration_minutes,
    }))
  const cards = tries.length ? tries : placeholders

  return (
    <>
      <section className="home-hero">
        <div>
          <h1 className="display">
            Small moments.
            <br />
            Growing connection.
          </h1>
          <p className="hero-description">Stories, gentle activities, and memories for your pregnancy journey.</p>
          <div className="hero-actions">
            <ButtonLink to="/sample">
              Try an activity <Icon name="arrow" size={18} />
            </ButtonLink>
            <ButtonLink to="/#how-it-works" variant="secondary">
              Explore the program
            </ButtonLink>
          </div>
          <p className="hero-footnote">
            <Icon name="heart" size={14} />
            Free to try. No account needed for samples.
          </p>
        </div>
        <div className="hero-art">
          <Artwork name="family-reading" eager alt="" />
        </div>
      </section>

      <section className="value-cards" aria-label="What Little Bloom offers">
        {values.map((v) => (
          <article key={v.title} className={`value-card ${v.tone}`}>
            <Artwork name={v.image} />
            <div>
              <h2>{v.title}</h2>
              <p>{v.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="home-section">
        <div className="section-heading">
          <h2>Try a few activities</h2>
          <Link className="text-link" to="/sample">
            View all activities <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="try-cards">
          {cards.map((c) => (
            <Link key={c.title} to={c.slug ? `/sample/${c.slug}` : '/sample'} className="try-card">
              <Artwork name={c.image} />
              <div>
                <h3>{c.title}</h3>
                <p>{c.summary}</p>
                <Chip tone="peach" icon="clock">
                  {c.minutes} min
                </Chip>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="home-how">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OUR APPROACH</p>
            <h2>Fourteen little moments, at your pace.</h2>
            <p>A gentle program of stories, quiet pauses and shared activities. Any order, no end date.</p>
          </div>
          <Icon name="leaf" size={36} className="text-sage-600" />
        </div>
        <ol>
          {[
            ['Make yourself at home', 'Try a sample, then sign in when you are ready to save your moments.'],
            ['Choose a little moment', 'Read a story, share your voice, or take a gentle pause.'],
            ['Bring someone along', 'Invite a partner to share activities and the memories you choose.'],
            ['Keep what matters', 'Save a note or a voice recording. Come back whenever you like.'],
          ].map(([title, description], i) => (
            <li key={title}>
              <span className="step-number">{i + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="memories" className="home-privacy">
        <Artwork name="shared-moment" />
        <div>
          <p className="eyebrow">
            <Icon name="lock" size={15} />
            YOUR FAMILY. YOUR SPACE.
          </p>
          <h2 className="display">
            Some things are
            <br />
            just for you.
          </h2>
          <p>
            Your memories start private. Choose what to share with your partner, and keep the rest for
            yourself. No public profiles, likes, or feeds.
          </p>
          <Link to="/privacy" className="text-link">
            Learn how your space stays private <Icon name="arrow" size={16} />
          </Link>
        </div>
      </section>

      <section className="pilot-banner">
        <div>
          <h2>A small beginning, with room to bloom.</h2>
          <p>
            Little Bloom is in a limited pilot. Explore the free samples today; saving your own space requires
            a pilot invitation.
          </p>
        </div>
        <ButtonLink to="/sample" variant="light">
          Find your first moment <Icon name="arrow" size={16} />
        </ButtonLink>
      </section>
    </>
  )
}
