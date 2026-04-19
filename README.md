# Stream Mate Companion MVP

This repo is for a streamer-side companion app.

The chosen deployment model is:

- keep the code in GitHub
- run a small local helper on the streaming PC
- open the UI in a browser at `localhost`

This means the MVP does not need a separate cloud server.

If you want to try it on GitHub Pages, the right split is:

- GitHub Pages hosts the static browser UI
- your streaming PC still runs the local helper at `127.0.0.1:3030`

GitHub Pages cannot run the helper API by itself because it is static hosting only.

## What it does right now

- shows a local browser panel
- captures microphone audio in the browser
- sends short audio chunks to the local helper for transcription
- accepts recent streamer speech, chat flow, VC context, and game state
- returns short local advice cards for:
  - pacing nudges
  - topic recovery
  - first-time-viewer context help
  - energy shifts
  - clip hints
- uses OpenAI when configured
- falls back to local rule-based advice when OpenAI is not configured

## Important note

This version does not post to Twitch chat.

It is intentionally a local experiment so the streamer can test the advice safely before any posting features are considered.

## Core files

- [server.mjs](C:/Users/kesakai/Documents/Codex/2026-04-19-24/server.mjs)
- [start-local-helper.ps1](C:/Users/kesakai/Documents/Codex/2026-04-19-24/start-local-helper.ps1)
- [config.example.json](C:/Users/kesakai/Documents/Codex/2026-04-19-24/config.example.json)
- [config.local.template.json](C:/Users/kesakai/Documents/Codex/2026-04-19-24/config.local.template.json)
- [docs/mvp-spec.md](C:/Users/kesakai/Documents/Codex/2026-04-19-24/docs/mvp-spec.md)
- [docs/localhost-architecture.md](C:/Users/kesakai/Documents/Codex/2026-04-19-24/docs/localhost-architecture.md)
- [src/prompt.mjs](C:/Users/kesakai/Documents/Codex/2026-04-19-24/src/prompt.mjs)
- [src/fallback.mjs](C:/Users/kesakai/Documents/Codex/2026-04-19-24/src/fallback.mjs)
- [public/index.html](C:/Users/kesakai/Documents/Codex/2026-04-19-24/public/index.html)

## Local helper model

GitHub stores the code.

The streaming PC runs the helper locally and keeps secrets locally:

- `OpenAI API key`
- future Twitch tokens if chat reading is added later

The browser UI talks only to the local helper at `127.0.0.1`.

## Setup

1. Copy `config.local.template.json` to `config.local.json`
2. Fill in `openai.apiKey`
3. Set a model in `openai.model`
4. Run the local helper
5. Open `http://127.0.0.1:3030`

## Run

Recommended:

```powershell
.\start-local-helper.ps1
```

Direct run:

```powershell
& 'C:\Users\kesakai\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\server.mjs
```

## Try it on GitHub

The GitHub Pages version hosts only the front-end.
The local helper still runs on your own PC.

1. Push this folder to a GitHub repository
2. Enable GitHub Pages for this repository
3. Run the helper locally on your PC with `.\start-local-helper.ps1`
4. Open your GitHub Pages URL in the browser
5. Leave the helper URL set to `http://127.0.0.1:3030` and click `Connect helper`

Notes:

- GitHub Pages is static hosting, so the browser page talks across origins to your local helper
- the helper now allows requests from `https://*.github.io`
- browsers generally allow secure pages to access loopback addresses such as `http://127.0.0.1`
- for the actual streaming PC, the local helper model is still the recommended deployment

## Config note

Do not commit `config.local.json`.

It is ignored by `.gitignore` so keys stay local to the streaming PC.

## Current scope

Implemented:

- local helper HTTP server
- browser UI
- chunked microphone transcription through the local helper
- OpenAI-backed advice generation
- fallback advice generation
- companion persona rules

Not yet implemented:

- Twitch EventSub chat receive
- full low-latency Realtime API transcription
- any Twitch posting

## Recommended next steps

1. Add Twitch chat receive through EventSub WebSocket
2. Merge transcript and chat into one rolling context window
3. Improve the live transcript cleanup for filler words and repeated chunks
4. Upgrade from chunked transcription to a fuller realtime connection if needed
5. Keep the app in suggest-only live mode until the experiment feels safe
