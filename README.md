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

## Telegram Setup

### Important constraint

This project is Telegram-ready, not Telegram-delivered.

Today the app:

- stores Telegram handles for the main web flow
- renders narrator messages in a Telegram-ready format inside the app
- does not yet call the Telegram Bot API directly

That means the current app does not require a bot token, webhook, or polling worker to run. Players still need to use their real Telegram handles consistently, and if you want a Telegram bot to open the Web App you configure that around the app, not inside the current codebase.

### Local Telegram-ready setup

Use this when you want to test the real web flow on your machine instead of the `/simulator` route.

1. Start the app locally:

```bash
npm install
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000).
3. Create a game from `/` using the normal Telegram-ready form.
4. Enter real-looking Telegram handles such as `@fede`, `@mauri`, and `@seba` when creating and joining players.
5. Share the local invite link manually with anyone else testing on the same network, or just open the join page yourself in another browser session.

Optional local bot setup:

1. Create a bot with BotFather.
2. Ask testers to start the bot once in Telegram.
3. If you want Telegram to open the local Web App, expose your local app through an HTTPS tunnel such as `ngrok`, `Cloudflare Tunnel`, or similar.
4. Point the bot menu button or Web App button at that public HTTPS tunnel URL.

Local environment notes:

- no Telegram-specific environment variable is required today
- `.env.local` is only needed if you want to force a specific storage mode locally
- the simulator can stay enabled locally with the default development behavior, or explicitly with `PIXELPARTY_ENABLE_SIMULATOR=true`

Example local `.env.local`:

```bash
PIXELPARTY_GAME_STORAGE=filesystem
PIXELPARTY_UPLOAD_STORAGE=filesystem
PIXELPARTY_ENABLE_SIMULATOR=true
```

### Production Telegram-ready setup

Use this when you want the normal web flow deployed for real players.

1. Deploy the Next.js app behind HTTPS.
2. Configure persistent storage:
   - `POSTGRES_URL` or `DATABASE_URL` for game state
   - `BLOB_READ_WRITE_TOKEN` for uploaded evidence
3. Keep the simulator disabled unless you explicitly want it:
   - `PIXELPARTY_ENABLE_SIMULATOR=false`
4. Create a bot with BotFather if you want Telegram to be the entrypoint into the web app.
5. Ask every player to start the bot once in Telegram.
6. Point the bot menu button, deep link, or Web App button at your deployed HTTPS app URL.
7. Require players to enter the same Telegram handle they use in Telegram when they join the non-simulator flow.

Example hosted configuration:

```bash
POSTGRES_URL=postgres://user:password@host:5432/pixelparty
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
PIXELPARTY_ENABLE_SIMULATOR=false
```

Production behavior today:

- the app itself still does not read a Telegram bot token
- the app still does not register a Telegram webhook or run polling
- the app still does not store Telegram chat IDs
- the app still does not send real Telegram DMs
- Telegram is currently used as identity context and optional app entrypoint, not as a live delivery channel

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
