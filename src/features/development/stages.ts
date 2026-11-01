export const JOURNEY_DURATION = 43

// Half-length version of the 86-second a-little-sun-bonding film: same chapter order.
export const journeyChapters = [
  { label: 'Beginning', at: 0, preview: 3.5 },
  { label: 'Growing', at: 8.5, preview: 17.5 },
  { label: 'Voice', at: 22.5, preview: 24 },
  { label: 'Stories', at: 25.5, preview: 27 },
  { label: 'Music', at: 28.5, preview: 30.5 },
  { label: 'Sunrise', at: 31.5, preview: 40.5 },
] as const

const scenes = [
  { at: 0, badge: 'A little beginning', title: 'Every life begins with a little wonder.', description: 'From a spark to a sunrise. The story of a life, growing in light.' },
  { at: 2.5, badge: 'Around week 2', title: 'A spark of possibility.', description: 'The journey begins with a single cell.' },
  { at: 5.5, badge: 'Weeks 3–4', title: 'Small beginnings. Endless wonder.', description: 'A tiny cluster begins to find its home.' },
  { at: 8.5, badge: 'Weeks 5–8', title: 'Life begins to take shape.', description: 'The earliest structures begin to form.' },
  { at: 12, badge: 'Weeks 9–12', title: 'A little more you. Every day.', description: 'A small, growing form. A widening world.' },
  { at: 15.5, badge: 'Weeks 13–20', title: 'Growing into the light.', description: 'Little limbs move as the journey continues.' },
  { at: 19, badge: 'Weeks 21–28', title: 'A world of hope, held within.', description: 'Each passing week brings new changes.' },
  { at: 22.5, badge: 'Prenatal bonding · Voice', title: 'Your voice becomes light.', description: 'A familiar voice. A little moment of connection.' },
  { at: 25.5, badge: 'Prenatal bonding · Stories', title: 'A story becomes a sky of stars.', description: 'A few quiet words. A world to share.' },
  { at: 28.5, badge: 'Prenatal bonding · Music', title: 'A gentle melody. A golden thread.', description: 'Little moments, gathered into light.' },
  { at: 31.5, badge: 'Weeks 29–36', title: 'Closer to your sunrise.', description: 'Growing, maturing, preparing to meet you.' },
  { at: 35, badge: 'Weeks 37–40', title: 'Almost time to meet the sun.', description: 'A new beginning is drawing near.' },
  { at: 38.5, badge: 'Birth · A new beginning', title: 'A little life. A whole world of hope.', description: 'Like the sun, you bring a new day.' },
] as const

export function stageIndexAt(seconds: number) {
  for (let index = journeyChapters.length - 1; index >= 0; index--) {
    if (seconds >= journeyChapters[index].at) return index
  }
  return 0
}

export function sceneAt(seconds: number) {
  for (let index = scenes.length - 1; index >= 0; index--) {
    if (seconds >= scenes[index].at) return scenes[index]
  }
  return scenes[0]
}
