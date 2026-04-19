# Localhost Helper Architecture

This project is designed for:

- GitHub for source control
- the streaming PC for the local helper
- a browser on the streaming PC for the UI

No separate cloud server is required for the MVP.

## Runtime split

### GitHub repo

Stores:

- UI code
- helper code
- prompts
- fallback rules
- docs

Does not store:

- `config.local.json`
- API keys
- local Twitch tokens

### Streaming PC local helper

Runs:

- local HTTP server on `127.0.0.1`
- OpenAI requests
- future Twitch EventSub WebSocket connection
- in-memory transcript state for the live microphone experiment

Keeps secrets local to the PC.

### Browser UI

Opened at:

- `http://127.0.0.1:3030`

Used for:

- entering current stream context
- capturing microphone audio
- receiving local advice cards
- showing the live transcript feed
- later showing live chat flow

## Why this is the right fit

- no paid cloud box is required
- keys stay on the streaming PC
- the repo stays clean for GitHub
- the browser UI still feels like a normal HTML tool
- the experiment stays safe because nothing is posted to Twitch

## Next build stages

1. Add Twitch chat receive via EventSub WebSocket
2. Merge transcript and chat into a rolling context window
3. Add cleanup rules for duplicated chunks and filler-heavy lines
4. Upgrade from chunked helper transcription to lower-latency realtime transport if needed
5. Add stronger local-only advice modes like `context recap` and `finish that thought`
