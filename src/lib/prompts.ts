// Daily "little conversation" prompts (talking to the baby, known as 태담 or 对话胎教 in
// Korean and Chinese apps) and public-domain lullaby words. These are moments for the
// parent. Nothing here claims an effect on the baby's development.

export const talkPrompts = [
  'Say hello and tell your little one your name.',
  'Describe what you had for breakfast and whether you enjoyed it.',
  'Tell them about the sounds you can hear right now.',
  'Share one thing that made you smile today.',
  'Describe the view from your favourite window.',
  'Talk about a song that means something to you, then hum a little of it.',
  'Tell them about someone in the family they will meet one day.',
  'Describe the season outside: the light, the air, the colours.',
  'Share a small hope you have for the coming week.',
  'Tell a two-sentence story about an animal you love.',
  'Talk about a meal your family often makes together.',
  'Describe a place where you feel calm.',
  'Say what you are grateful for today, even something tiny.',
  'Tell them about a game you loved playing as a child.',
  'Read aloud a few lines from whatever you are reading now.',
  'Describe your home: the room you spend most time in and why.',
  'Talk about a tradition you would like to share with them.',
  'Tell them about the first time you heard you were expecting them.',
  'Describe the walk or journey you took today.',
  'Share a funny thing that happened recently.',
  'Talk about a book you would like to read together one day.',
  'Tell them about your favourite time of day and why.',
  'Describe a smell you love: rain, bread, flowers, anything.',
  'Say one thing you are looking forward to.',
  'Talk about the people who are excited to meet them.',
  'Describe the sky right now, or the last time you looked at it.',
  'Tell them about a kindness someone showed you.',
  'Share something you are learning at the moment.',
  'Talk about a place your family comes from.',
  'Simply say: “I’m here, and I’m glad you are too.”',
] as const

/** A stable prompt for the local calendar day, so it doesn't change on each visit. */
export function dailyPrompt(now: Date = new Date()): string {
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
  return talkPrompts[day % talkPrompts.length]
}

export interface Lullaby {
  slug: string
  title: string
  origin: string
  lines: string[]
}

// Public-domain texts only (plan §8.1 rights register: see docs/research/prenatal-platforms.md).
export const lullabies: Lullaby[] = [
  {
    slug: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    origin: 'Words by Jane Taylor, 1806. Public domain.',
    lines: [
      'Twinkle, twinkle, little star,',
      'How I wonder what you are!',
      'Up above the world so high,',
      'Like a diamond in the sky.',
      'Twinkle, twinkle, little star,',
      'How I wonder what you are!',
    ],
  },
  {
    slug: 'sleep-baby-sleep',
    title: 'Sleep, Baby, Sleep',
    origin: 'Traditional German lullaby, 19th-century English words. Public domain.',
    lines: [
      'Sleep, baby, sleep,',
      'Thy father guards the sheep;',
      'Thy mother shakes the dreamland tree,',
      'Down falls a little dream for thee:',
      'Sleep, baby, sleep.',
    ],
  },
  {
    slug: 'hush-little-baby',
    title: 'Hush, Little Baby',
    origin: 'Traditional American lullaby. Public domain. Swap in any names you like.',
    lines: [
      'Hush, little baby, don’t say a word,',
      'Mama’s going to buy you a mockingbird.',
      'And if that mockingbird won’t sing,',
      'Mama’s going to buy you a diamond ring.',
      'And if that diamond ring turns brass,',
      'Mama’s going to buy you a looking glass.',
    ],
  },
]
