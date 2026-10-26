-- Little Bloom seed data. Synthetic and editorial fixtures only — never real family data.
--
-- IMPORTANT: this content is an editorial starting point. It is published here so the
-- app is usable in development, but none of it has passed the review workflow.
-- Health-related cards are flagged is_placeholder and show a "not yet clinically
-- reviewed" banner. The admin dashboard lists every published version that lacks a
-- recorded review; clear that list before the pilot (section 23).

-- Development pilot admissions (local only; manage real admissions in /admin).
insert into public.pilot_admissions (email, note) values
  ('parent@example.com', 'local development'),
  ('parent2@example.com', 'local development'),
  ('operator@example.com', 'local development')
on conflict do nothing;

create function pg_temp.add_item(
  p_slug text, p_kind text, p_category text, p_sample boolean, p_pos int,
  p_title text, p_summary text, p_body text, p_solo text, p_together text,
  p_reflection text, p_minutes int, p_health boolean default false,
  p_placeholder boolean default false, p_transcript text default null)
returns void
language plpgsql
as $$
declare
  v_item uuid;
  v_ver uuid;
begin
  insert into public.content_items (slug, kind, category, is_sample, program_position)
  values (p_slug, p_kind, p_category, p_sample, p_pos)
  returning id into v_item;
  insert into public.content_versions (
    item_id, version, status, title, summary, body, solo_steps, together_steps, reflection_prompt,
    duration_minutes, health_related, is_placeholder, transcript, revision_note, published_at)
  values (
    v_item, 1, 'published', p_title, p_summary, p_body, p_solo, p_together, p_reflection,
    p_minutes, p_health, p_placeholder, p_transcript, 'Seed content — requires review before the pilot', now())
  returning id into v_ver;
  update public.content_items set published_version_id = v_ver where id = v_item;
end;
$$;

-- ---------------------------------------------------------------------------
-- The 14-activity program (section 8.2). Any order, any pace, nothing locks.
-- ---------------------------------------------------------------------------
select pg_temp.add_item('say-hello', 'activity', 'voice', true, 1,
  'Say hello',
  'Introduce yourself in your own words. There is no script to get right.',
  'Some people like to mark the start of this journey with a few spoken words. You might say your name, what today was like, or one thing you are looking forward to. Short and ordinary is perfect.',
  E'Find a comfortable spot.\nSay hello and introduce yourself, out loud or quietly.\nMention one small thing about your day.\nFinish whenever you like.',
  E'Take turns introducing yourselves.\nEach share one thing you are looking forward to.\nKeep it light — there is no wrong answer.',
  'Write a short welcome note you might like to read again later.', 5);

select pg_temp.add_item('first-story', 'activity', 'story', true, 2,
  'Read a first story',
  'Read "The Little Lantern" aloud at a gentle pace.',
  E'The Little Lantern\n\nAt the edge of a quiet village there was a little lantern that hung by a blue door. Every evening, when the sky turned the colour of peaches, someone lit it with a careful hand.\n\nThe lantern was small. It could not light the whole street, or the hills, or the sea beyond them. But it could light the step in front of the blue door, and that was enough for anyone coming home.\n\nOne night the wind came running down the hill. It rattled the shutters and tugged at the washing lines. The little lantern flickered, then steadied, then flickered again.\n\n"Hold on," whispered the blue door.\n\nThe lantern held on. And when the wind had gone off to play somewhere else, the step was still lit, warm and golden, waiting.\n\nThe end.',
  E'Read the story aloud, slowly.\nPause anywhere you like.\nIf a sentence stands out, read it twice.',
  E'Take turns reading paragraphs.\nOne of you can be the voice of the blue door.',
  'Which sentence would you keep?', 5);

select pg_temp.add_item('quiet-pause', 'activity', 'calm', true, 3,
  'A quiet pause',
  'A few unhurried minutes of stillness, in whatever position feels comfortable.',
  'This is simply a pause. You do not need to breathe in a special way or reach any particular state. If anything feels uncomfortable, stop, change position, or end the activity.',
  E'Sit or lie in a position that feels comfortable for you.\nLet your shoulders soften.\nNotice three sounds around you.\nStay as long as feels good, then gently carry on with your day.',
  E'Sit together somewhere comfortable.\nShare the quiet without needing to talk.\nAfterwards, tell each other one thing you noticed.',
  'How did the moment feel?', 5);

select pg_temp.add_item('family-story', 'activity', 'family', false, 4,
  'Share a family story',
  'Tell a story from your family — funny, small, or treasured.',
  'Families are made of stories: the time someone got lost on the way to a wedding, a recipe that never quite worked, a grandparent''s favourite saying. Choose one you enjoy telling.',
  E'Pick a story from your family or your own childhood.\nTell it out loud as if to a friend.\nYou can record it as a voice memory if you would like to keep it.',
  E'Each tell one family story.\nAsk each other one question about the other''s story.',
  'Record or write down the story so it is not forgotten.', 10);

select pg_temp.add_item('sing-a-song', 'activity', 'music', false, 5,
  'Sing a familiar song',
  'Sing or hum a song you know, in your own voice. Tune is optional.',
  'Choose any song that means something to you — a lullaby, a song from a road trip, something from your culture or childhood. Hum it if you do not remember the words. Keep the volume comfortable.',
  E'Choose a song you know well.\nSing or hum it, as loudly or softly as you like.\nIf you do not remember the words, make some up.',
  E'Choose a song you both know.\nSing it together, or take turns with the verses.',
  'Note down the song and why you chose it.', 5);

select pg_temp.add_item('special-place', 'activity', 'family', false, 6,
  'A place that matters',
  'Describe a place that is important to you or your family.',
  'It might be a kitchen, a park bench, a beach, a city, or a place you have only heard about. Describe what it looks like, what it sounds like, and why it matters.',
  E'Picture the place clearly.\nDescribe it out loud: what you see, hear and smell there.\nSay why it matters to you.',
  E'Each describe a place that matters.\nTalk about whether there is somewhere you would like to visit together one day.',
  'Write a few lines about the place.', 10);

select pg_temp.add_item('repeat-a-favourite', 'activity', 'reflect', false, 7,
  'Repeat a favourite',
  'Go back to any activity you enjoyed and do it again.',
  'Repetition is part of the fun. Choose any activity from the program — or one from Explore — and enjoy it again.',
  E'Open Explore or your favourites.\nChoose an activity you liked.\nDo it again, changing anything you want.',
  E'Each choose a favourite activity.\nDo one of them together.',
  'What did you enjoy about it this time?', 5);

select pg_temp.add_item('second-story', 'activity', 'story', false, 8,
  'Read a second story',
  'Read "The Garden That Waited" alone or together.',
  E'The Garden That Waited\n\nIn the corner of a small yard there was a patch of earth that had been dug and smoothed and watered. Nothing seemed to be happening there at all.\n\nThe sparrow hopped by. "Nothing yet," she said.\nThe cat stretched on the wall. "Nothing yet," he yawned.\nThe rain tapped on the soil. "Not yet," it agreed, "but soon."\n\nThe garden did not mind. It was busy in a way you could not see, deep down where it was dark and quiet and warm.\n\nAnd one morning, when the sparrow came hopping by, there was a tiny curl of green.\n\n"Hello," said the sparrow.\nThe garden, of course, said nothing. But it seemed, somehow, pleased.\n\nThe end.',
  E'Read the story aloud at an easy pace.\nPause after each "not yet".',
  E'One of you reads the narrator, the other reads the sparrow, the cat and the rain.',
  'Would you like to record yourself reading it?', 5);

select pg_temp.add_item('hopes', 'activity', 'reflect', false, 9,
  'Share your hopes',
  'Talk or write about hopes for your family — without any pressure or promises.',
  'Hopes can be big or small: a trip, a tradition, a kind of home you want to make. They are not promises or plans, and they can change.',
  E'Think of two or three hopes for your family.\nSay them out loud or write them privately.\nNotice how it feels to name them.',
  E'Each share one hope.\nListen without needing to agree or plan anything.',
  'Write a private reflection about your hopes.', 10);

select pg_temp.add_item('invite-partner', 'activity', 'voice', false, 10,
  'Invite someone to read or speak',
  'Ask your partner — or someone close — to read a story or say a few words.',
  'If you have a partner, you can invite them to Little Bloom from Family. If you are doing this solo, you can ask someone close to read a story aloud while you listen. Solo use is completely welcome.',
  E'Choose a story from Explore.\nAsk someone close to read it aloud while you listen.\nOr read it yourself, imagining sharing it with someone.',
  E'Your partner chooses a story or writes a few words.\nThey read or speak while you listen.\nSave it as a shared memory if you both want to.',
  'Save a shared memory if you would like to.', 10);

select pg_temp.add_item('explore-a-card', 'activity', 'learn', false, 11,
  'Explore a learning card',
  'Read one of the short learning cards and note a question to ask your care provider.',
  'The learning cards are short and general. They cannot answer questions about your own pregnancy — your midwife, doctor or care team can. This activity is about noticing questions you would like to ask.',
  E'Open a learning card from Explore.\nRead it slowly.\nWrite down any question you would like to ask your care provider.',
  E'Read a card together.\nEach note one question to bring to your next appointment.',
  'Write down a question for later.', 5);

select pg_temp.add_item('another-quiet-moment', 'activity', 'calm', false, 12,
  'Another quiet moment',
  'Choose your own kind of calm: a pause, a slow walk, or a relaxation transcript.',
  'Pick whatever calm looks like for you today. A relaxation transcript is available in Explore if you would like words to follow. Stop at any time if something feels uncomfortable.',
  E'Choose a calm activity that suits you today.\nGive it a few unhurried minutes.\nCarry on when you are ready.',
  E'Choose a calm activity together.\nOne of you can read a relaxation transcript to the other.',
  'Write a short reflection.', 10);

select pg_temp.add_item('revisit-a-memory', 'activity', 'reflect', false, 13,
  'Revisit a memory',
  'Open a memory you saved earlier and enjoy it again.',
  'Your memories are kept privately unless you chose to share them. Pick one to read or play. If you have not saved any yet, this is a good moment to start.',
  E'Open Memories.\nChoose one entry to read or listen to.\nNotice what you would like to remember about it.',
  E'Choose a shared memory to revisit together.\nTell each other what you remember about that day.',
  'What is your favourite moment so far?', 5);

select pg_temp.add_item('a-routine-to-keep', 'activity', 'reflect', false, 14,
  'Choose a routine to keep',
  'Pick one small ritual you would like to continue.',
  'You have reached the end of the program — however long it took and however many activities you chose. Choose one small routine to keep, if any. You can repeat any activity at any time.',
  E'Look back at the activities you enjoyed.\nChoose one small routine you would like to continue.\nYou can add a calendar reminder from Settings if that helps.',
  E'Each choose a routine you enjoyed.\nAgree on one you would like to keep, if you want to.',
  'Write a closing note.', 5);

-- ---------------------------------------------------------------------------
-- Parent-read stories (original works; rights held by the project).
-- ---------------------------------------------------------------------------
select pg_temp.add_item('the-little-lantern', 'story', 'story', true, null,
  'The Little Lantern', 'A small light that holds on through a windy night.',
  (select v.body from public.content_versions v join public.content_items i on i.id = v.item_id where i.slug = 'first-story'),
  '', '', '', 4);

select pg_temp.add_item('the-garden-that-waited', 'story', 'story', false, null,
  'The Garden That Waited', 'Something is happening, even when you cannot see it.',
  (select v.body from public.content_versions v join public.content_items i on i.id = v.item_id where i.slug = 'second-story'),
  '', '', '', 4);

select pg_temp.add_item('the-boat-called-maybe', 'story', 'story', false, null,
  'The Boat Called Maybe', 'A little boat learns that not knowing is part of every journey.',
  E'The Boat Called Maybe\n\nIn a harbour full of boats with sensible names — Steadfast, Reliable, Sure-and-True — there was one small boat called Maybe.\n\n"Where are you going?" the big boats asked each morning.\n"Maybe the island," said Maybe. "Maybe the lighthouse. Maybe just around the bay."\n\nThe big boats shook their masts. "You should always know where you are going."\n\nBut Maybe liked the mornings when the mist was still on the water and every direction was possible. Maybe found the cove where the seals slept, and the rock shaped like a sleeping dog, and the quiet place where the water turned green as glass.\n\nIn the evening, Maybe came home, bobbing gently into the harbour.\n"Where did you go?" asked the big boats.\n"Somewhere lovely," said Maybe. "I did not know it until I got there."\n\nThe end.',
  '', '', '', 5);

select pg_temp.add_item('the-moon-and-the-kettle', 'story', 'story', false, null,
  'The Moon and the Kettle', 'A gentle bedtime tale about ordinary evenings.',
  E'The Moon and the Kettle\n\nEvery evening, the moon looked in through the kitchen window, and every evening the kettle began to sing.\n\n"What are you singing about?" asked the moon.\n"Oh, nothing much," said the kettle. "The cups. The spoons. The sound of the door when someone comes home."\n\n"That does not sound like much," said the moon.\n"It is everything," said the kettle, and it whistled, and someone smiled and poured the tea.\n\nThe moon watched for a long time. Then it shone a little brighter on the windowsill, just to be part of it.\n\nThe end.',
  '', '', '', 3);

select pg_temp.add_item('pip-counts-the-stars', 'story', 'story', false, null,
  'Pip Counts the Stars', 'A small mouse tries to count every star — and finds a better idea.',
  E'Pip Counts the Stars\n\nPip the mouse decided to count every star in the sky.\n"One," said Pip. "Two. Three…"\nAt forty-seven, a cloud drifted past and Pip lost count.\n\n"One," said Pip again. "Two…"\nAt one hundred and three, Pip yawned so widely that the stars went blurry.\n\nAn old owl looked down from the branch above. "Why count them all?" she asked.\n"So I know how many there are," said Pip.\n"Choose one instead," said the owl. "Give it a name. Then you will always know where it is."\n\nPip chose a small, bright star just above the hill and named it Button.\nAnd every night after that, Pip said, "Goodnight, Button," and slept very well.\n\nThe end.',
  '', '', '', 4);

select pg_temp.add_item('the-house-that-made-room', 'story', 'story', false, null,
  'The House That Made Room', 'A house discovers it can always make a little more space for love.',
  E'The House That Made Room\n\nThere was once a house that was very fond of its family. It knew the creak of every step and the sound of every laugh.\n\nOne day the family began to move things about. A chair went upstairs. A box of old books went into the loft. A small, empty corner appeared by the window where the light was warmest.\n\n"What is the corner for?" the house wondered.\nThe family painted it. They hung something soft there. Sometimes they just stood in it, talking quietly.\n\nThe house did not know exactly what was coming. But it knew how to do one thing very well. It settled its beams, and warmed its walls, and made room.\n\nThe end.',
  '', '', '', 4);

-- ---------------------------------------------------------------------------
-- Relaxation transcripts. Audio not yet recorded; transcripts are always available.
-- ---------------------------------------------------------------------------
select pg_temp.add_item('settle-in', 'audio', 'calm', false, null,
  'Settle in', 'A three-minute settling script.', '', '', '', '', 3, false, false,
  E'Find a position that feels comfortable for you right now. You can change it at any time.\n\nLet your eyes close if that feels right, or rest your gaze softly on something nearby.\n\nNotice where your body is supported — by the chair, the bed, the floor.\n\nLet your shoulders drop a little. Let your jaw loosen.\n\nThere is nothing you need to do in these few minutes. Thoughts may come and go; that is fine.\n\nWhen you are ready, notice the sounds around you, open your eyes, and return to your day at your own pace.');

select pg_temp.add_item('three-good-things', 'audio', 'calm', false, null,
  'Three good things', 'A short script for noticing small good moments.', '', '', '', '', 4, false, false,
  E'Settle into a comfortable position.\n\nThink of one small good thing from today. It might be a taste, a kind word, or a moment of quiet. Hold it in mind for a moment.\n\nNow think of a second good thing. It can be even smaller than the first.\n\nAnd a third. If you cannot think of a third, that is fine — notice the comfortable position you are in right now.\n\nWhen you are ready, gently return to your day.');

select pg_temp.add_item('a-calm-place', 'audio', 'calm', false, null,
  'A calm place', 'Imagine a place where you feel at ease.', '', '', '', '', 5, false, false,
  E'Make yourself comfortable.\n\nImagine a place where you feel at ease. It can be real or imagined — a beach, a garden, a favourite room.\n\nNotice what you can see there. The colours. The light.\n\nNotice what you can hear. Perhaps water, birds, or quiet.\n\nStay there for as long as you like.\n\nWhen you are ready, let the picture fade, notice the room around you, and carry on gently.');

select pg_temp.add_item('end-of-day', 'audio', 'calm', false, null,
  'End of the day', 'A gentle wind-down for the evening.', '', '', '', '', 4, false, false,
  E'Find a comfortable way to sit or lie down.\n\nThink back over the day without judging it. Notice one moment you would like to keep, and one you are happy to let go.\n\nLet your hands rest. Let your breathing find its own pace.\n\nYou do not need to finish anything else tonight.\n\nWhen you are ready, take your time getting up, or let yourself drift towards sleep.');

-- ---------------------------------------------------------------------------
-- Education cards. Health-related cards are PLACEHOLDERS pending qualified review.
-- ---------------------------------------------------------------------------
select pg_temp.add_item('about-little-bloom', 'education', 'learn', true, null,
  'What Little Bloom is — and isn''t',
  'A bonding and memory-keeping app. Not medical care.',
  E'Little Bloom offers short activities, stories and a private place for memories. It is designed to be enjoyable, not to change how a baby develops.\n\nLittle Bloom does not diagnose, monitor or assess pregnancy or fetal health, and it cannot replace your midwife, doctor or care team.\n\nSkipping activities is completely fine. There is no schedule to keep up with.',
  '', '', '', 2);

select pg_temp.add_item('when-to-get-help', 'education', 'learn', false, null,
  'When to contact your care provider',
  'If you are worried, contact your care team — do not wait for an app.',
  E'If you are worried about yourself or your baby, contact your midwife, doctor or maternity unit straight away, or your local emergency number in an emergency.\n\nLittle Bloom cannot tell whether something is wrong and does not monitor your pregnancy.\n\nYour care team can give you the contact numbers that apply where you live — it can help to save them in your phone.',
  '', '', '', 2, true, true);

select pg_temp.add_item('reading-aloud', 'education', 'learn', false, null,
  'Reading and talking aloud',
  'Why some families enjoy reading and talking during pregnancy.',
  E'Many families enjoy reading or talking aloud during pregnancy as a way to slow down and feel connected.\n\nLittle Bloom presents this as an enjoyable experience for you. It does not claim that reading or talking improves a baby''s intelligence or development.',
  '', '', '', 2, true, true);

select pg_temp.add_item('comfortable-positions', 'education', 'learn', false, null,
  'Getting comfortable',
  'Choose positions that feel right for you, and change them whenever you need to.',
  E'Every activity in Little Bloom can be done in whatever position feels comfortable for you.\n\nIf you have been given advice about positions for resting or sleeping, follow your care provider''s guidance. Stop any activity that feels uncomfortable.',
  '', '', '', 2, true, true);

select pg_temp.add_item('calm-breathing', 'education', 'learn', false, null,
  'Breathing at your own pace',
  'The quiet activities never ask you to hold your breath or breathe in a special way.',
  E'The calm activities in Little Bloom invite you to slow down, not to follow a breathing technique.\n\nIf you feel dizzy, short of breath or unwell at any point, stop and seek advice from your care provider.',
  '', '', '', 2, true, true);

select pg_temp.add_item('partners-welcome', 'education', 'learn', false, null,
  'Partners are welcome',
  'How an invited partner can take part.',
  E'You can invite one partner from Family. They get their own sign-in, can do activities, and can save their own memories.\n\nEverything is private by default. Only memories that the author chooses to share are visible to the other person.\n\nSolo use is fully supported — every activity has solo instructions.',
  '', '', '', 2);

select pg_temp.add_item('feelings', 'education', 'learn', false, null,
  'Your feelings count',
  'Pregnancy can bring many feelings. Support is available.',
  E'It is common to feel a mix of emotions during pregnancy.\n\nIf you feel low, anxious or overwhelmed for more than a short time, or if you have thoughts of harming yourself, please talk to your care provider or contact local emergency or crisis services.',
  '', '', '', 2, true, true);

select pg_temp.add_item('rest-and-sleep', 'education', 'learn', false, null,
  'Rest',
  'Small moments of rest count.',
  E'Little Bloom''s activities are short so they can fit around rest, work and everything else.\n\nIf you have questions about sleep or tiredness during pregnancy, your care provider can advise you.',
  '', '', '', 2, true, true);

select pg_temp.add_item('sound-and-music', 'education', 'learn', false, null,
  'Sound and music',
  'Keep volume comfortable — there is no need for speakers on your bump.',
  E'Little Bloom''s music activities are about enjoying songs in your own voice at a comfortable volume.\n\nThe app does not recommend placing headphones or speakers on the abdomen and does not play audio automatically.',
  '', '', '', 2, true, true);

select pg_temp.add_item('memories-without-pressure', 'education', 'learn', false, null,
  'Memories without pressure',
  'There is no right number of memories to keep.',
  E'Some people save a memory every day; others save one or two over the whole pregnancy. Both are fine.\n\nYou can download your memories at any time from Settings → Privacy. Please test any recording you particularly want to keep.',
  '', '', '', 2);

select pg_temp.add_item('staying-active', 'education', 'learn', false, null,
  'Moving in ways that feel right',
  'Ask your care provider what activity is right for you.',
  E'Little Bloom does not include exercise programs.\n\nYour care provider can tell you which kinds of physical activity are suitable for you during pregnancy.',
  '', '', '', 2, true, true);

select pg_temp.add_item('questions-for-appointments', 'education', 'learn', false, null,
  'Questions for your appointments',
  'A simple way to keep track of questions.',
  E'It can be easy to forget questions during appointments. Some people keep a private note in Little Bloom''s Memories and bring it along.\n\nYour care team is the right place for questions about your own pregnancy.',
  '', '', '', 2, true, true);

-- Rights register for project-owned text content.
insert into public.asset_licenses (asset_path, title, creator, license, attribution, allowed_uses) values
  ('/editorial-assets/README', 'All seeded stories, scripts and transcripts', 'Little Bloom project',
   'Original work owned by the project', '', 'Use within Little Bloom; confirm ownership before external reuse')
on conflict do nothing;
