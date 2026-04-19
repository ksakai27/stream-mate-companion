# MVP Spec

## Goal

Build a live stream companion app for the streamer.

This app is not meant to auto-post to Twitch.
It should create momentum, light back-and-forth ideas, and recover dropped topics.

## Target use

- the streamer is live
- the local helper is running on the streaming PC
- the browser panel is open on `localhost`
- the app shows short advice cards that are easy to react to

## Companion personality

- official stream companion
- playful, slightly cheeky
- easy to argue with
- never cruel
- never lecture-heavy
- should leave room for the streamer to respond

## Main advice types

### Nudge

Examples:

- `Do not drop that topic halfway.`
- `That is the third self-drag in a row.`

### Topic recovery

Examples:

- `Give the ending in one line.`
- `Finish the Taiwan story before you leave it.`

### Context help

Examples:

- `Explain the VC context in one sentence.`
- `Say that again for first-time viewers.`

### Clip hint

Examples:

- `That weird phrasing is the bit. Sit on it for one more beat.`
- `This is the strongest moment on screen right now.`

## Trigger ideas

- the streamer says `what was I saying`
- self-deprecating lines repeat
- VC context is referenced without explanation
- a weird original observation appears
- gameplay interrupts a good topic before it lands

## Safety rules

- no abuse
- no identity attacks
- no posting to Twitch
- no long monologues
- no obvious mood-killing
- no constant negativity

## Priority order

1. easy for the streamer to answer
2. useful for clip moments
3. understandable for first-time viewers
4. does not overshadow the streamer

## Shipping path

### Current

- browser panel
- helper API
- chunked microphone transcription
- prompt-based advice
- fallback rules

### Next

- Twitch chat receive
- rolling context window
