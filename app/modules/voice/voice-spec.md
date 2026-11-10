# Voice spec: "What's just now possible?"

Rules for every script. Read with `skeletons.json` (beat timing) and `banned-phrases.json` (lint). The exemplars in `exemplars/` show the voice; this file is the rulebook.

## Length and form
- English. Informal and provocative.
- About 700 to 750 words for a five-minute episode, at roughly 150 words per minute.
- One idea per scene. A scene is one narration block with one on-screen element.
- Short sentences, written for the ear. Most sentences fit in one breath. Split anything over about 25 words.
- Contractions are fine. Read every line aloud in the head before accepting it.

## Opening and closing
- Open with a concrete hook: one visible fact from this week, stated plainly. No greeting, no "today we'll talk about", no preamble.
- Close with a question to the audience. One question, asked directly, answerable in a comment.

## Provocation through evidence, not verdicts
- Provoke through tension between evidence. Set two things side by side and let the gap show.
  - Good: "The study says people stop reading the cart. The product ships a one-click buy. So what changes?"
  - Good: "The paper measures X. The release notes describe Y. Which one is the product?"
- Never provoke through verdicts about companies, people or products. No "is a scam", "is doomed", "is hype", "will fail".
- Never forecast markets or prices. Never give investment or trade advice.

## The practitioner's lens
- Speak from more than 26 years of consulting work: what the customer experiences, where projects stall, what gets checked first.
- The lens is general. Do not name employers, clients, deals or internal projects. Do not say "at my bank", "our customers" or any job title in the owner's employer voice.
- Describe patterns seen in practice ("in the projects I have seen, the question is almost always..."), not specific cases that could be traced to a client.

## Labelling opinion
- Every opinion is personal, and every opinion scene starts with the label "My take." on screen and in the narration.
- Facts never carry the label. A scene with a verified claim is evidence, not opinion.
- An opinion scene needs at least one evidence scene before it in the same episode.

## Numbers and quotes
- Numbers are not spoken from memory. The narration may say a number only if it is held by a verified claim, and the on-screen number is read from that claim.
- Quotes are word for word from the source, with the speaker named. No paraphrase in quotation marks.

## Pronunciation
- Use the respellings in `modules/audio/pronunciation.json` for narration text where the voice would misread a term.

## Banned
- Filler and hype phrases listed in `banned-phrases.json`.
- Lists of three adjectives used for emphasis.
- Rhetorical questions in the middle of the episode. Questions belong at the close.
- Calls to vote, buy, follow, or act on a stance. The closing question invites a comment only.

## Checklist before a script passes
1. Opens on a concrete hook, closes on one question.
2. Every fact sentence maps to a verified claim.
3. Each scene carries one idea.
4. Opinion is labelled "My take." and sits after evidence.
5. No employer, client, deal, verdict, forecast or advice.
6. Word count within 700 to 750. No banned phrase or pattern hit.
