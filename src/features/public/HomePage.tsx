import { useEffect } from 'react'
import { ButtonLink, Card } from '@/components/ui'

const steps = [
  { title: 'Understand something briefly', body: 'Short, plain-language cards — clearly marked when content is still awaiting review.' },
  { title: 'Choose an activity', body: 'Fourteen gentle activities — stories, songs, quiet pauses — in any order, at your own pace.' },
  { title: 'Enjoy the moment', body: 'Do it solo or together. Skip, repeat, or stop whenever you like. Nothing locks.' },
  { title: 'Keep a memory, if you want', body: 'Private notes and short voice recordings. Share only what you choose.' },
]

export default function HomePage() {
  useEffect(() => {
    document.title = 'Little Bloom'
  }, [])
  return (
    <div className="space-y-14 py-6">
      <section className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-semibold text-sage-700">Private pilot</p>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Small moments of connection while you wait to meet your baby.</h1>
          <p className="mt-4 text-lg text-ink-soft">
            Little Bloom offers short reading, conversation and relaxation activities, plus a private place to keep
            family memories. It is about enjoying the experience — it makes no claims about your baby's development.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink to="/sample">Try an activity</ButtonLink>
            <ButtonLink to="/sign-in" variant="secondary">Sign in to the pilot</ButtonLink>
          </div>
          <p className="mt-3 text-sm text-ink-soft">No account or pregnancy details needed to try a sample.</p>
        </div>
        <Card className="bg-peach-50">
          <p className="text-sm font-semibold uppercase tracking-wide text-peach-700">Example · 5 minutes</p>
          <h2 className="mt-2 text-2xl font-bold">Read a first story</h2>
          <p className="prose-lb mt-3 text-ink-soft">
            {'At the edge of a quiet village there was a little lantern that hung by a blue door. Every evening, when the sky turned the colour of peaches, someone lit it with a careful hand…'}
          </p>
          <ButtonLink to="/sample/first-story" variant="ghost" className="mt-4 -ml-4">
            Read the whole story →
          </ButtonLink>
        </Card>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="text-2xl font-bold">How it works</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Card as="li" key={s.title}>
              <p className="text-sm font-bold text-peach-700">{i + 1}</p>
              <h3 className="mt-1 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
            </Card>
          ))}
        </ol>
      </section>

      <section aria-labelledby="privacy" className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 id="privacy" className="text-xl font-bold">Private by default</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-soft">
            <li>Memories are visible only to their author unless explicitly shared.</li>
            <li>Pregnancy details are optional, and never required to try a sample.</li>
            <li>No advertising, no selling of data, no recordings in analytics.</li>
            <li>Export or delete your data at any time.</li>
          </ul>
        </Card>
        <Card>
          <h2 className="text-xl font-bold">About the pilot</h2>
          <p className="mt-3 text-ink-soft">
            We are running a small, free pilot with 25 families. Access is by invitation and requires a Google
            account. Partners join through a link from the account owner.
          </p>
          <p className="mt-3 text-ink-soft">
            Little Bloom is not medical care. For anything about your health or your baby, contact your care provider.
          </p>
        </Card>
      </section>
    </div>
  )
}
