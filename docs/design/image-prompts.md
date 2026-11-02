# Image prompts for OpenAI

Every card on Explore currently picks its picture by **category**, so all items in one category
share an image. This sheet gives every activity, audio, learning card and story its own image,
and replaces the repeated images on the other pages.

## How to generate

- **Model:** OpenAI GPT Image (`gpt-image-1` or newer), or ChatGPT image generation.
- **Size:** `1536x1024` (landscape) unless the prompt says **square** (`1024x1024`).
- **Quality:** `high`. Output PNG.
- **Keep the style consistent:** paste the **style block** below in front of *every* prompt.
  In ChatGPT, also attach `public/editorial-assets/quiet-pause.webp` and
  `public/editorial-assets/story-garden.webp` and add: *"Match the painting style of the attached
  images exactly."*
- **Cropping:** cards crop to about 2:1, so the prompts ask for the subject in the middle band.
- **Save as** the file name shown in each heading (PNG is fine), all in one folder, e.g.
  `art-inbox/`. Claude will convert them to WebP and wire them into the app.

### Style block (paste before every prompt)

```
Warm hand-painted storybook illustration in gouache and watercolour on textured cream paper, visible soft brush strokes and paper grain. Palette: cream and ivory, sage and eucalyptus green, dusty terracotta and coral, peach, honey-coloured wood, soft golden light. Calm, cosy, unhurried mood; uncluttered composition with breathing room. Natural, diverse, kind-looking people with relaxed expressions, modest everyday clothing. No text, letters, numbers, logos, watermarks or borders. No medical equipment, hospitals, ultrasound images or phone screens showing content. Keep the main subject in the centre horizontal band so it survives a wide 2:1 crop.
```

---

## 1. Program activities (14)

### `say-hello`
A young South Asian woman, visibly pregnant, sitting cross-legged on a cushioned window seat in soft morning light, one hand resting lightly on her bump, speaking softly with a shy smile. A mug of tea on the sill, a trailing fern, sheer curtains.

### `first-story`
A bearded man sitting on a rug with his back against the sofa, reading a picture book aloud; the book's cover shows a small glowing lantern. His pregnant partner lies back on cushions beside him, smiling with eyes half closed. Warm lamp light, early evening.

### `quiet-pause`
**Keep the existing image** `quiet-pause.webp` — no new image needed.

### `family-story`
A grandmother with silver hair and a knitted cardigan telling a story with animated hands at a wooden kitchen table. Her pregnant daughter and the daughter's partner listen and laugh. Teapot, a plate of biscuits, softly blurred framed photographs on the wall behind.

### `sing-a-song`
A pregnant woman with long braids standing barefoot in a sunlit kitchen, eyes half closed, humming and gently swaying, a wooden spoon in one hand like a microphone. A small vintage radio on the shelf, herbs in pots, a few petals drifting in the light.

### `special-place`
A couple seen from behind, sitting on a weathered wooden bench on a hillside at golden hour, looking out over a lake and a small village. Her head rests on his shoulder. Wildflowers and long grass in the foreground.

### `repeat-a-favourite`
Still life, no people: a well-loved picture book lying open on a patchwork quilt, a ribbon bookmark and a pressed flower between the pages, a cup of tea and a pair of reading glasses beside it, afternoon sunlight across the quilt.

### `second-story`
Two partners side by side on a wooden garden swing seat under a tree, sharing one picture book. In front of them a small raised garden bed with tiny green seedlings just breaking through the soil.

### `hopes`
A pregnant woman and her partner lying on a picnic blanket in a meadow at dusk, both looking up, one pointing at the first evening star. Dandelion seeds drifting in the air, a soft peach and lavender sky.

### `invite-partner`
**Reuse the existing image** `voice-memory.webp` — no new image needed.

### `explore-a-card`
A person at a kitchen table writing in a small notebook, a neat stack of illustrated cards beside them (no readable text), a pencil, a bowl of clementines. Focus on hands and upper body, morning light.

### `another-quiet-moment`
A pregnant woman taking a slow walk along a tree-lined path in early autumn, hands in the pockets of a long sage coat, a few golden leaves falling. Peaceful, unhurried, soft sunlight through the trees.

### `revisit-a-memory`
A couple on a sofa wrapped in one knitted blanket, eyes closed and smiling, listening together to a phone resting face-down on the blanket between them. Evening lamp light, a candle on the side table.

### `a-routine-to-keep`
No people, or only a pair of hands: a sunny windowsill in the morning with a small copper watering can watering a tiny seedling in a terracotta pot, two matching mugs beside it, a blank wall calendar softly out of focus behind.

---

## 2. Audio (4)

### `a-calm-place`
An imagined peaceful place, no people: a sunlit forest clearing with a still pond, soft moss, ferns, dappled golden light and a small wooden jetty reaching into the water.

### `end-of-day`
**Reuse the existing image** `evening.webp` — no new image needed.

### `settle-in`
Getting ready for sleep: a bed with soft linen sheets, a knitted blanket half pulled up, a lit bedside lamp, a closed book on the nightstand, a sleepy cat curled at the foot of the bed. Dusk blue window.

### `three-good-things`
Still life, no people: three small good things on a wooden table in morning light — a ripe peach, a little glass jar of wildflowers, and a folded handwritten note (no readable writing).

---

## 3. Learning cards (12)

### `about-little-bloom`
Two pairs of hands with different skin tones gently cupping a small terracotta pot with a single glowing green seedling. Soft golden light, plain sage background. Hopeful and simple.

### `calm-breathing`
A woman sitting by an open window, eyes closed, shoulders relaxed, curtains lifting gently in a breeze, steam rising from a cup of tea on the sill. Light, airy, calm.

### `comfortable-positions`
A pregnant person resting on their side on a deep sofa, propped up by many soft cushions with a pillow between their knees, reading a book, relaxed and comfortable.

### `feelings`
Two friends sitting on stone steps outside a house with potted plants. One has an arm around the other, who looks thoughtful; the moment feels supportive and quiet. Soft overcast light.

### `memories-without-pressure`
Still life, no people: an open scrapbook with mostly empty cream pages, only one pressed flower and a single small blank card tucked in. A pencil and a sprig of eucalyptus beside it. Relaxed, unfinished, no pressure.

### `partners-welcome`
**Reuse the existing image** `together.webp` — no new image needed.

### `questions-for-appointments`
A person by a front door slipping a small notebook and pencil into a canvas tote bag, coat hanging on a hook, keys in a ceramic bowl, a plant on a shelf. Ready to head out, calm and organised.

### `reading-aloud`
A pregnant woman curled in a wingback armchair reading a picture book aloud, a dog dozing at her feet, rain on the window behind her, warm lamp light.

### `rest-and-sleep`
An afternoon nap: a person dozing in a hammock on a shaded porch under a light blanket, a closed book on their chest, potted plants and dappled sunlight.

### `sound-and-music`
A couple slow-dancing barefoot on a woven rug in a living room, a record player playing softly on a low shelf across the room. Golden evening light, gentle and joyful.

### `staying-active`
A pregnant woman and a friend walking comfortably along a seaside promenade in the morning, both in trainers, one carrying a water bottle, chatting and smiling, gentle waves and gulls.

### `when-to-get-help`
A reassuring moment, not alarming: a person sitting on the edge of a bed making a calm phone call, their partner beside them with a supportive hand on their back. Soft daylight, tidy bedroom.

---

## 4. Stories (6) — storybook scenes, animal characters, no people

### `pip-counts-the-stars`
A tiny brown field mouse sitting on top of a wooden fence post at night, one paw pointing up at a sky full of warm golden stars, a dandelion clock beside it. Deep teal-green night sky, meadow below.

### `the-boat-called-maybe`
A small wooden rowing boat with a patched cream sail drifting on a calm, misty sea at dawn, a curious seagull perched on its bow, soft peach sky and distant islands.

### `the-garden-that-waited`
**Reuse the existing image** `story-garden.webp` — no new image needed.

### `the-house-that-made-room`
A crooked, cosy cottage on a hill at dusk with warm glowing windows. A new little round-windowed room has been added to its side. A rabbit, a hedgehog and a cat are arriving at the open front door; birds nest on the roof.

### `the-little-lantern`
A small glowing paper lantern hanging from a branch on a windy night, leaves and petals swirling around it while its flame stays steady and warm. Dark teal sky, a few stars.

### `the-moon-and-the-kettle`
A cosy cottage kitchen at night: a copper kettle gently steaming on an old stove, a large friendly full moon looking in through the window, a single teacup waiting on the sill.

---

## 5. Other pages (19)

### `page-sign-in` — Sign-in page
A sage-green front door standing slightly open in the evening, warm light spilling out onto a doormat, potted plants and a small lantern on the step. Welcoming.

### `page-samples` — Samples page
A picnic basket open on a blanket in a garden, with two small picture books, a teacup and a bowl of berries — a little taste of something lovely.

### `home-understand` — Home, "Understand"
A pregnant woman in a sunlit library nook reading a book with curiosity, shelves of books and a plant behind her.

### `home-connect` — Home, "Connect"
A couple sitting close on a porch step at golden hour, foreheads almost touching, his hand resting over hers on her bump.

### `home-remember` — Home, "Remember"
An open wooden keepsake box on a table: a tiny knitted hat, a ribbon, pressed flowers and a bundle of small letters tied with twine. Soft afternoon light.

### `onboard-about` — Onboarding step 1
A wooden garden gate swinging open onto a winding flower-lined path in morning light — the start of something.

### `onboard-journey` — Onboarding step 2
A gentle path of stepping stones winding through soft rolling hills toward a sunrise, wildflowers along the way.

### `onboard-agree` — Onboarding step 3 (privacy and terms)
A small wooden keepsake box with a brass clasp and a little key resting on top, tied with a ribbon, on a table in warm light. Safe and private.

### `choice-solo` — Onboarding "My pregnancy journey" (**square**, shown as a small circle)
Close-up portrait of a pregnant woman from the shoulders up, smiling softly, holding a book against her chest. Simple cream background, face centred.

### `choice-together` — Onboarding "Together with my partner" (**square**, shown as a small circle)
Close-up portrait of a couple cheek to cheek, both smiling. Simple cream background, faces centred.

### `today-your-space` — Today, "Your space, your pace"
An inviting reading corner with an empty armchair, a lit floor lamp, a folded blanket and a stack of books — waiting for you.

### `today-conversation` — Today, daily prompt
A person on a window seat speaking softly, cup of tea in hand, gentle rain on the glass, warm interior light.

### `today-family-story` — Today, "A family story"
An open photo album on a lap (photos only as soft colour shapes), a grandparent's hand pointing at one, a grandchild-to-be's hand beside it.

### `today-saved` — Today, "Your saved moments"
A small wooden shelf of treasured things: a jar of seashells, pressed flowers in little frames, a tiny knitted toy rabbit, a candle.

### `memory-note-1` — Memories, written note
A folded handwritten letter (no readable writing) with a sprig of lavender on soft linen.

### `memory-note-2` — Memories, written note
A small stack of cream envelopes tied with twine and a dried flower, on a wooden desk.

### `memory-voice-1` — Memories, voice note
A phone lying face-down on a knitted blanket next to a mug, with golden petals drifting upward like soft sound.

### `memory-voice-2` — Memories, voice note
Two silhouettes at a window at night, one speaking softly, the other leaning in to listen, warm lamp behind them.

### `family-circle` — Family page
A small family circle on a picnic blanket under a big tree: a couple, two grandparents and a friend, laughing together in golden light.

---

## 6. Gentle versions for paused mode (2)

When a family pauses baby-related content, these images are shown instead. **No bump, baby or
baby items.**

### `family-paused` — Family page when paused
Two people sitting quietly together on a bench by a lake in soft morning mist, shoulders touching, holding warm drinks.

### `empty-plan` — Empty family plan lists
Seedlings in a row of tiny terracotta pots with blank wooden plant markers, on a sunny windowsill.

---

**Total: 52 new images** — 31 for content (36 items, 5 of which reuse existing art) and 21 for
the other pages.
