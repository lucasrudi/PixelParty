# PixelParty

Pixel-art multiplayer bachelor-party WebApp inspired by the original `tincho-en-tailandia` PixelForge game, rebuilt for the browser with a dynamic narrator loop, daily side quests, proof validation, and a local simulator.

## What This MVP Includes

- A lobby flow where one host creates a game instance, sets the trip start and end dates, and gets a public invite link
- Join flow for friends using the public link
- Telegram identity and bot-delivery flow using Telegram website login, Telegram handles, and bot-linked chat IDs
- A daily narrator loop that:
  - sends context for the current scene
  - asks each player what they are doing
  - assigns a side quest with escalating points
- Evidence submission for each quest using either an uploaded file, a proof URL, or a Telegram photo/video message
- Player validation inboxes where other players can accept or reject pending evidence
- A final scoreboard with player titles and an epic wrap-up
- A `/simulator` route where players can join using names only and test the full lifecycle locally

## Telegram Setup

### Current behavior

This project now has a working Telegram binding and delivery layer for the main game flow.

- stores Telegram handles for the main web flow
- can verify a Telegram account from the website and remember that linked identity in the browser
- captures a Telegram user/chat id automatically when the Web App is opened from Telegram
- reads `TELEGRAM_BOT_TOKEN` on the server and can verify the configured bot through `/api/telegram/bot`
- exposes the configured bot username publicly through `TELEGRAM_BOT_USERNAME` or `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- accepts Telegram webhook updates through `/api/telegram/webhook`
- lets players bind their Telegram account to an in-game identity using bot deep links
- can pre-link a player from the website-first Telegram login flow before they ever tap the bot
- sends a first Telegram DM after create or join when the Web App already provided the Telegram user id
- delivers `telegram-ready` narrator and player-specific game messages to linked Telegram chats
- answers `/today` in Telegram with the current quest
- accepts a photo or video with a caption in Telegram as evidence for today's quest

Players should still use their real Telegram handles consistently. Telegram Login reduces the extra bind friction by proving which Telegram account belongs to the current browser session, and the bot/WebApp flow can still capture chat IDs directly when players come in through Telegram.

### Local Telegram setup

Use this when you want to test the real web flow on your machine instead of the `/simulator` route.

1. Start the app locally:

```bash
npm install
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000).
3. Create a game from `/` using the normal Telegram form.
4. Enter real-looking Telegram handles such as `@fede`, `@mauri`, and `@seba` when creating and joining players.
5. Create a bot with BotFather.
6. If you want the low-friction website login path too, enable **Bot Settings > Web Login** in BotFather and add your local origin or HTTPS tunnel to the allowed URLs.
7. Set these environment variables:

```bash
TELEGRAM_BOT_TOKEN=123456:abcde-your-token
TELEGRAM_BOT_USERNAME=pixelparty_bot
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=pixelparty_bot
TELEGRAM_BINDING_ENCRYPTION_KEY=replace-with-a-long-random-secret
TELEGRAM_WEBHOOK_SECRET_TOKEN=replace-with-a-second-long-random-secret
APP_URL=https://your-public-tunnel.example.com
PIXELPARTY_GAME_STORAGE=filesystem
PIXELPARTY_UPLOAD_STORAGE=filesystem
PIXELPARTY_ENABLE_SIMULATOR=true
PIXELPARTY_TELEGRAM_LOGIN_CLIENT_ID=123456789
PIXELPARTY_TELEGRAM_LOGIN_CLIENT_SECRET=telegram_web_login_secret
PIXELPARTY_PUBLIC_URL=https://your-public-tunnel.example.com
```

8. Expose your local app through an HTTPS tunnel such as `ngrok`, `Cloudflare Tunnel`, or similar.
9. Register the Telegram webhook:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$APP_URL/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET_TOKEN"
```

10. Open the Web App from Telegram if you want create and join to trigger the first DM automatically.
11. Ask each tester to send `/start` to the bot once so the chat can be linked even when they do not enter through the Web App.
12. If you enabled Telegram Login, testers can also use `Continue With Telegram` on `/` or `/join/...` to pre-link from the browser before switching over to the bot flow.

Usage notes:

- the create and join flow can send an immediate Telegram DM when the player entered through Telegram WebApp
- `/today` sends the active quest back into Telegram
- a photo or video with a caption submits evidence for today's quest
- if one Telegram account is in multiple active games, use `/today INVITE` or start the evidence caption with `INVITE: description`

### Production Telegram setup

Use this when you want the normal web flow deployed for real players.

1. Deploy the Next.js app behind HTTPS.
2. Configure persistent storage:
   - `POSTGRES_URL` or `DATABASE_URL` for game state
   - `BLOB_READ_WRITE_TOKEN` for uploaded evidence
3. Configure the Telegram bot env vars:
   - `TELEGRAM_BOT_TOKEN` for the server-side Telegram Bot API integration
   - `TELEGRAM_BOT_USERNAME` for server-side bot metadata and link generation
   - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` if the client should render the public bot link directly
   - `TELEGRAM_BINDING_ENCRYPTION_KEY` to encrypt Telegram identifiers at rest
   - `TELEGRAM_WEBHOOK_SECRET_TOKEN` to authenticate Telegram webhook calls
   - `APP_URL` or `PIXELPARTY_PUBLIC_URL` so Telegram messages can link players back into the deployed app
   - `PIXELPARTY_TELEGRAM_LOGIN_CLIENT_ID` and `PIXELPARTY_TELEGRAM_LOGIN_CLIENT_SECRET` if you want the website-first Telegram login path
4. Register the Telegram webhook to point at `https://your-domain/api/telegram/webhook`.
5. Keep the simulator disabled unless you explicitly want it:
   - `PIXELPARTY_ENABLE_SIMULATOR=false`
6. Ask every player to start the bot once in Telegram.
7. Require players to enter the same Telegram handle they use in Telegram when they join the non-simulator flow.
8. Open the Web App from Telegram if you want create or join to trigger the first DM automatically.
9. If Telegram Login is enabled, players can use the website `Continue With Telegram` buttons on `/` and `/join/...` to pre-link from the browser without sending them to the bot first.

Example hosted configuration:

```bash
POSTGRES_URL=postgres://user:password@host:5432/pixelparty
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
TELEGRAM_BOT_TOKEN=123456:abcde-your-token
TELEGRAM_BOT_USERNAME=pixelparty_bot
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=pixelparty_bot
TELEGRAM_BINDING_ENCRYPTION_KEY=replace-with-a-long-random-secret
TELEGRAM_WEBHOOK_SECRET_TOKEN=replace-with-a-second-long-random-secret
APP_URL=https://pixelparty.example.com
PIXELPARTY_PUBLIC_URL=https://pixelparty.example.com
PIXELPARTY_ENABLE_SIMULATOR=false
PIXELPARTY_TELEGRAM_LOGIN_CLIENT_ID=123456789
PIXELPARTY_TELEGRAM_LOGIN_CLIENT_SECRET=telegram_web_login_secret
```

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
- outbound internet access for user-uploaded proof URLs and Telegram Bot API traffic
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
- `/api/telegram/bot` — Telegram bot status and profile summary
- `/api/telegram/webhook` — Telegram bot webhook for binding chats, `/today`, and receiving evidence media

## Validation

```bash
npm test
npm run lint
npm run build
```

## Persistence

By default, local development stores game state in `.data/games.json` and uploaded proof files in `public/uploads/`. In hosted environments, you can externalize those two pieces with Postgres and Blob while keeping the same application code paths.
