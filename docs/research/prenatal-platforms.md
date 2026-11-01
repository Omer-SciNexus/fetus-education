# Prenatal education platforms: what they do and what Little Bloom took from them

**Researched:** 1 November 2026. **Method:** App Store listings, product pages, regulator notices and press, gathered by web search.
Feature lists are mostly self-reported by developers and vary by country and date. Treat them as a snapshot, not an audit.

## 1. Platforms reviewed

| Platform | Market | What it's known for | Bonding or "fetal education" features | Business model | Privacy or claims issues |
|---|---|---|---|---|---|
| BabyCenter | Global | Week-by-week content, Birth Clubs by due month | "Bumpie" belly-photo timelapse, daily highlights | Ads, rewards points, registry | Ad tracking; Mozilla *Privacy Not Included* warning (2022) |
| What to Expect | US | Weekly 3D videos, themed size comparisons | "My Journal"; "Partner Playbook" (unconfirmed) | Ads, registry | Mozilla says data may be sold |
| Flo (pregnancy mode) | Global | Week counter, weekly stories | Guided journey (paid) | Subscription | FTC settlement (2021) for sharing pregnancy data with Facebook/Google; Meta found liable by a jury (2025) |
| Ovia | US | Broad health logging | — | Employer and health-plan benefit | Employer access to aggregated data |
| Pregnancy+ (Philips) | Global | 3D models, the richest tool set | Bump photo diary; invite family to follow | Freemium ($34.99/yr) | Location and identifiers linked to user |
| The Bump | US | Universal registry | — | Commerce | — |
| Sprout | Global | Realistic 3D fetal models | Symptom journal | Freemium | Users complain about paywalls |
| Glow Nurture | Global | Community, AI "insights" | — | Subscription | 2020 California AG settlement over security flaws |
| Peanut | Global | Social matching | "Bump Buddies" due-date friends | Subscription | — |
| BabyPlus | Global | Belly-worn "sound lessons" device | 1 hour/day rhythmic audio | Hardware | Claims cognitive benefit; researchers say there is no evidence |
| Count the Kicks | US nonprofit | Kick counting | — | Free | Advertising device ID still listed |
| Expectful | US | Guided meditation, hypnobirthing | Breathing for the parent | Subscription | Hard to cancel |
| 宝宝树 Babytree | China | Huge community, AI Q&A | 胎教 stories and music; **Dad edition** with tips for fathers | Coins, ¥7/week knowledge subscription | Spam texts to fathers reported (2024) |
| 美柚 Meiyou | China | Period, pregnancy and parenting modes | Daily knowledge push; family edition | Membership | Named by China's MIIT (2022) for over-collection |
| 亲宝宝 Qinbaobao | China | Private family cloud album | Per-member hiding of individual entries | Membership | — |
| 마미톡 Mamitalk | Korea | Hospital ultrasound delivery | Daily **태담** (talking to the baby) over 40 weeks | Commerce, paid classes | AI "future face" add-on |
| 베이비빌리 BabyBilly | Korea | ~2M users | Mascot with daily cards; **태명** (bump nickname) helper; couple co-recording; PDF notebook | Commerce, points | — |
| 280days | Japan/Korea | Talking baby illustration | Couple sharing, encouragement cards, printed **baby book** | Ads ($1.99 to remove) | — |
| 모아베베 Moabebe | Korea | Daily voice 태담 | Parents record their voices daily | — | Claims 태담 "helps fetal intelligence" |

Main sources: Apple App Store listings for each app; FTC press release on Flo (Jan 2021); Mozilla *Privacy Not Included* reviews;
NIHR summary of the AFFIRM trial; ABC News on BabyPlus; chinanews.com (Nov 2024) on Babytree and Meiyou.

## 2. Features that appear on most top platforms

1. **Week-by-week content** with a size comparison (fruit, animal or snack).
2. **Due date countdown and calculator.**
3. **Kick counter and contraction timer.**
4. **Logs** for weight, symptoms and appointments.
5. **Bump photo diary** or timelapse.
6. **Checklists:** hospital bag, birth plan, baby names.
7. **Community** grouped by due month.
8. **Daily content and reminders.**
9. **Monetization** through ads, tracking SDKs, registry and commerce. This is the root of most privacy failures in the sector.

## 3. What Asian "fetal education" (胎教 / 태교) apps add

1. **Talking to the baby** (对话胎教 / 태담): a short daily prompt, often recorded as voice.
2. **A bump nickname** (태명) used throughout the app.
3. **A partner or "dad" edition**, with encouragement and couple recording.
4. **Short, low-volume listening sessions** of stories, lullabies and calm music.
5. **A keepsake baby book** exported at the end.

## 4. What Little Bloom adopted (November 2026)

All of these keep the product's rules: no medical claims, private by default, nothing sent to third parties, no paid services.

| Feature | Inspired by | How Little Bloom does it |
|---|---|---|
| **Week by week** with countdown and size comparison | BabyCenter, What to Expect, Flo, Pregnancy+ | Shown only when a due date is set, and hidden while pregnancy content is paused. Text says these are *typical, approximate* figures, not about this baby. Marked as placeholder until clinically reviewed. Static data in `src/lib/weeks.ts`. |
| **Due date estimate** from the first day of the last period | Every tracker | LMP + 280 days, labelled as an estimate that a clinician's dating replaces. |
| **Bump nickname** | BabyBilly 태명, 280days | Optional, set by the owner, and visible to the partner only when pregnancy details are shared. |
| **Daily little conversation** (talking to the baby) | Mamitalk 태담, Moabebe, 对话胎教 | One prompt a day on Today and a full list on `/talk`. Offers "record it" as a voice memory. Copy says to speak at a normal volume, with no speakers or headphones on the belly. |
| **Lullaby words** to sing in your own voice | 胎教 music, WavHello | Three public-domain texts only. No music library or redistributed recordings (plan §8.1). |
| **Breathing pacer** | Expectful, 情绪胎教 | Framed as a calm moment *for the parent*. No claims about the baby. Respects reduced motion. |
| **Family plan**: hospital bag, questions for my care provider, baby names | Pregnancy+, BabyCenter, 280days | Stored per family. Each entry is private or shared, as memories are. Shared items can be ticked by either partner, and both partners can heart names. |
| **Keepsake book** | 280days BABY BOOK, BabyBilly PDF | A printable page built in the browser from the user's own memories. Save as PDF with the browser's print dialog. Nothing is uploaded. |

## 5. What Little Bloom deliberately did not adopt

| Feature | Why not |
|---|---|
| Kick counter | Plan §3.2 excludes fetal monitoring and movement scoring. The AFFIRM trial (409,175 pregnancies) found no significant reduction in stillbirth and more interventions. NICE advises against routine formal counting. Instead, Help keeps the message: *if movements change, contact your care provider now.* |
| Contraction timer | A clinical tool. Hospitals give their own instructions, and a timer invites "go now / wait" advice that the product must not give. |
| Weight, symptom, blood pressure logs | Health profiling. These need clinical framing and would raise the data's sensitivity. |
| Bump photos, ultrasound sharing | Photos are deferred (plan §3.2). They are sensitive and would exceed the free storage budget. |
| Community, due-month clubs | Deferred (plan §3.2). They need moderation, and forum posts have exposed personal details elsewhere. |
| AI chat or AI "future baby face" | Deferred. Paid services, and a risk of medical-sounding answers. |
| Push, SMS or email reminders | Deferred. The existing optional `.ics` calendar reminder stays. |
| Ads, registry, commerce | No monetization in the pilot. Ad SDKs are the source of the Flo, Meiyou and Babytree problems. |
| "Raises IQ" or "cognitive development" claims | Not supported by controlled evidence. DeCasper & Spence (1986) shows only that newborns may prefer a familiar voice. |
| 3D fetal models | Deferred, and the owner chose to keep the native film over a WebGL rebuild. |

## 6. Privacy as the differentiator

In 2022 Mozilla flagged every pregnancy app it reviewed. Flo has an FTC order and a 2025 jury verdict, Ovia has employer data access,
and Meiyou has a regulator notice. Little Bloom has no third-party analytics or ad SDKs, keeps entries author-only by default,
uses pseudonymous aggregate events, and offers export and deletion. The new features follow the same rules. The landing page
and the privacy notice should say so plainly.
