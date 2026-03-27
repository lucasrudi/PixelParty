# PixelParty

Pixel-art multiplayer bachelor-party WebApp inspired by the original `tincho-en-tailandia` PixelForge game, rebuilt for the browser with a dynamic narrator loop, daily side quests, proof validation, and a local simulator.

## What This MVP Includes

- A lobby flow where one host creates a game instance, sets the trip start and end dates, and gets a public invite link
- Join flow for friends using the public link
- Telegram-ready identity flow with Telegram website login plus a manual handle fallback
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

- can verify a Telegram account from the website and remember that linked identity in the browser
- still stores Telegram handles for display and backward compatibility
- renders narrator messages in a Telegram-ready format inside the app
- does not yet call the Telegram Bot API directly

That means the current app still does not require a bot token, webhook, or polling worker to run. Telegram Login reduces the extra bind friction by proving which Telegram account belongs to the current browser session and requesting DM permission up front, but real message delivery still needs a later Bot API integration.

### Local Telegram-ready setup

Use this when you want to test the real web flow on your machine instead of the `/simulator` route.

1. Start the app locally:

```bash
npm install
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000).
3. If you only want the legacy fallback flow, create a game from `/` and enter Telegram handles such as `@fede`, `@mauri`, and `@seba` manually.
4. If you want the new low-friction website login flow, create a bot in BotFather, enable **Bot Settings > Web Login**, and add `http://localhost:3000` or your HTTPS tunnel origin to the allowed URLs.
5. Set the Telegram Login env vars locally:

```bash
PIXELPARTY_TELEGRAM_LOGIN_CLIENT_ID=123456789
PIXELPARTY_TELEGRAM_LOGIN_CLIENT_SECRET=telegram_web_login_secret
```

6. Restart `npm run dev`, then use the `Continue With Telegram` button on `/` or `/join/...`.
7. Share the local invite link manually with anyone else testing on the same network, or just open the join page yourself in another browser session.

Optional local bot setup:

1. Create a bot with BotFather.
2. If you want Telegram to open the local Web App, expose your local app through an HTTPS tunnel such as `ngrok`, `Cloudflare Tunnel`, or similar.
3. Add that HTTPS tunnel origin to BotFather Web Login allowed URLs.
4. Point the bot menu button or Web App button at that public HTTPS tunnel URL.

Local environment notes:

- Telegram login is optional; without the login env vars the manual-handle fallback still works
- `.env.local` is only needed if you want to force a specific storage mode locally
- the simulator can stay enabled locally with the default development behavior, or explicitly with `PIXELPARTY_ENABLE_SIMULATOR=true`

Example local `.env.local`:

```bash
PIXELPARTY_GAME_STORAGE=filesystem
PIXELPARTY_UPLOAD_STORAGE=filesystem
PIXELPARTY_ENABLE_SIMULATOR=true
PIXELPARTY_TELEGRAM_LOGIN_CLIENT_ID=123456789
PIXELPARTY_TELEGRAM_LOGIN_CLIENT_SECRET=telegram_web_login_secret
```

### Production Telegram-ready setup

Use this when you want the normal web flow deployed for real players.

1. Deploy the Next.js app behind HTTPS.
2. Configure persistent storage:
   - `POSTGRES_URL` or `DATABASE_URL` for game state
   - `BLOB_READ_WRITE_TOKEN` for uploaded evidence
3. Keep the simulator disabled unless you explicitly want it:
   - `PIXELPARTY_ENABLE_SIMULATOR=false`
4. Create a bot with BotFather and open **Bot Settings > Web Login**.
5. Add your deployed origin and callback URL origin to the allowed URLs in BotFather.
6. Set the Telegram Login credentials on the app:
   - `PIXELPARTY_TELEGRAM_LOGIN_CLIENT_ID`
   - `PIXELPARTY_TELEGRAM_LOGIN_CLIENT_SECRET`
7. Use the website `Continue With Telegram` buttons on `/` and `/join/...` to pre-link players from the browser without sending them to the bot first.
8. Optionally point the bot menu button, deep link, or Web App button at your deployed HTTPS app URL later if you want Telegram to become the entrypoint too.

Example hosted configuration:

```bash
POSTGRES_URL=postgres://user:password@host:5432/pixelparty
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
PIXELPARTY_ENABLE_SIMULATOR=false
PIXELPARTY_TELEGRAM_LOGIN_CLIENT_ID=123456789
PIXELPARTY_TELEGRAM_LOGIN_CLIENT_SECRET=telegram_web_login_secret
```

Production behavior today:

- the app can verify Telegram identity and request bot DM permission from the website
- the app still does not read a Telegram bot token
- the app still does not register a Telegram webhook or run polling
- the app now stores Telegram user IDs on linked players
- the app still does not send real Telegram DMs
- Telegram is now used as verified identity context and optional app entrypoint, but not yet as a live delivery channel

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
