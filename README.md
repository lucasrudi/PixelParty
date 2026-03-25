# PixelParty

Pixel-art multiplayer bachelor-party WebApp inspired by the original `tincho-en-tailandia` PixelForge game, rebuilt for the browser with a dynamic narrator loop, daily side quests, proof validation, and a local simulator.

## What This MVP Includes

- A lobby flow where one host creates a game instance, sets the trip start and end dates, and gets a public invite link
- Join flow for friends using the public link
- Telegram-ready identity flow using Telegram handles for the main WebApp
- A daily narrator loop that:
  - sends context for the current scene
  - asks each player what they are doing
  - assigns a side quest with escalating points
- Evidence submission for each quest using either an uploaded file or a proof URL / simulator placeholder
- Player validation inboxes where other players can accept or reject pending evidence
- A final scoreboard with player titles and an epic wrap-up
- A `/simulator` route where players can join using names only and test the full lifecycle locally

## Important Telegram Constraint

This project stores Telegram handles and creates Telegram-ready messages in the game feed, but it does not yet push real Telegram bot DMs. Telegram bots cannot reliably message users from just a username; each player must start the bot once so the app can bind the handle to a chat ID.

## Telegram Server Setup

If you want to run the Telegram-ready version in production today, the app server setup is simple because the current codebase does not yet talk directly to the Telegram Bot API.

### What the server needs today

1. Deploy the Next.js app behind HTTPS.
2. Pick one persistence strategy:
   - zero-config local storage with `.data/games.json` and `public/uploads/`
   - external storage with Postgres for game state and Blob for uploaded proof media
3. Expose the public app URL so players can open the web experience and join games.

### Telegram setup around the app

1. Create a bot with BotFather.
2. Ask every player to start the bot once in Telegram.
3. If you want the bot to open this web app, configure the bot menu or button to point to your deployed HTTPS URL.
4. Have players enter the same Telegram handle they use in Telegram when joining the non-simulator flow.

### What is not wired yet

- The app does not currently read a Telegram bot token from the server.
- The app does not currently register a Telegram webhook or run polling.
- The app does not currently store Telegram chat IDs.
- The app does not currently send real Telegram DMs; it only creates Telegram-ready narrator messages inside the app feed.

### What you will need when bot delivery is implemented

When the Telegram integration is added, the production server will need:

- a Telegram bot token in environment variables
- a webhook endpoint or polling worker
- persistent mapping between Telegram users and chat IDs
- bot commands or deep links so players can bind their Telegram account to the game
- HTTPS on the public domain used by the webhook and the Web App

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app defaults to local filesystem storage in development. If you want to force that behavior even when hosted env vars exist on your machine, add this to `.env.local`:

```bash
PIXELPARTY_GAME_STORAGE=filesystem
PIXELPARTY_UPLOAD_STORAGE=filesystem
```

## Deploying The Next.js App

This project can be deployed like a normal Next.js app. It supports two persistence shapes:

- local filesystem storage for single-host development or a sandbox/VPS with mounted persistent disk
- external storage for production-style Next.js hosting, using Postgres for game state and Blob for uploaded evidence

### Recommended deployment shape

For the most portable production deployment, use:

- a Postgres database for `game.json`-equivalent state
- Vercel Blob for uploaded photos and videos
- any Node.js-compatible Next.js host for the app itself

If you prefer to keep everything on one machine, the filesystem fallback still works on:

- a VPS
- a Docker container with a mounted volume
- a traditional Node hosting setup with writable persistent storage

### Build and run

```bash
npm install
npm run build
npm run start
```

By default, `npm run start` serves the production app on port `3000`. Put it behind HTTPS with a reverse proxy such as Nginx, Caddy, or your platform's ingress.

### What must persist in production

If you stay on the local filesystem, the deployment must preserve these paths between restarts and redeploys:

- `.data/games.json`
- `public/uploads/`

If you externalize storage, those local paths are no longer required for production durability.

### External storage setup

The app now auto-detects external storage:

- set `POSTGRES_URL` or `DATABASE_URL` to move game persistence out of `.data/games.json`
- set `BLOB_READ_WRITE_TOKEN` to move uploaded evidence out of `public/uploads/`

Optional overrides:

- `PIXELPARTY_GAME_STORAGE=filesystem|postgres`
- `PIXELPARTY_UPLOAD_STORAGE=filesystem|blob`
- `PIXELPARTY_ENABLE_SIMULATOR=true|false`

Example hosted configuration:

```bash
POSTGRES_URL=postgres://user:password@host:5432/pixelparty
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

With that setup:

- game reads and writes go to a `games` table in Postgres
- uploaded photos and videos are stored in Blob under `evidence/...`
- the app keeps the same API routes and UI behavior

Production note:

- in production, the local simulator is disabled by default
- if you really want it on a hosted deployment, set `PIXELPARTY_ENABLE_SIMULATOR=true`
- on serverless-style deployments, leaving game storage on the local filesystem now returns a clear configuration error instead of trying to write into an unavailable `.data` directory

### Environment and networking checklist

Before going live, make sure the server has:

- Node.js installed
- outbound internet access for user-uploaded proof URLs and future integrations
- an HTTPS public domain
- either:
  - enough writable disk space for `.data/` and `public/uploads/`, or
  - access to your Postgres database and Blob bucket/token

### Important hosting note

The storage rewrite that used to be required for ephemeral Next.js hosting is now built in:

- game state can live in Postgres
- uploaded files can live in Blob
- the filesystem remains available as a local fallback for simulator work and single-host setups

Edge Config was intentionally not used for live game state because this app updates game data frequently during play, while Edge Config is better suited to frequently read, infrequently changed configuration data such as flags, redirects, or feature switches.

## Main Routes

- `/` — landing page and Telegram-ready game creation
- `/join/[inviteCode]` — public lobby join page
- `/game/[gameId]?player=PLAYER_ID` — player dashboard
- `/simulator` — local names-only simulator

## Validation

```bash
npm test
npm run lint
npm run build
```

## Persistence

By default, local development stores game state in `.data/games.json` and uploaded proof files in `public/uploads/`. In hosted environments, you can externalize those two pieces with Postgres and Blob while keeping the same application code paths.
