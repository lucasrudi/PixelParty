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

This project now has a working Telegram binding and delivery layer for the main game flow.

Today the app:

- stores Telegram handles for the main web flow
- renders narrator messages in a Telegram-ready format inside the app
- reads `TELEGRAM_BOT_TOKEN` on the server and can verify the configured bot through `/api/telegram/bot`
- exposes the configured bot username publicly through `TELEGRAM_BOT_USERNAME` or `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- accepts Telegram webhook updates through `/api/telegram/webhook`
- lets players bind their Telegram account to an in-game identity using bot deep links
- stores Telegram chat IDs and Telegram identifiers encrypted at rest
- delivers `telegram-ready` narrator and player-specific game messages to bound Telegram chats

Players should still use their real Telegram handles consistently, and each player should start the bot once and complete the bind flow from the game dashboard before expecting Telegram delivery.

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

- `TELEGRAM_BOT_TOKEN` is optional locally unless you want to test the Telegram bot and webhook flow
- `TELEGRAM_BOT_USERNAME` or `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` is optional locally unless you want the bot CTA and bind links rendered correctly
- `TELEGRAM_BINDING_ENCRYPTION_KEY` is required if you want to bind Telegram users locally
- `TELEGRAM_WEBHOOK_SECRET_TOKEN` is recommended locally if you want to test webhook auth
- `APP_URL` or `NEXT_PUBLIC_APP_URL` is recommended when you want Telegram messages to include links back into the app
- `.env.local` is only needed if you want to force a specific storage mode locally
- the simulator can stay enabled locally with the default development behavior, or explicitly with `PIXELPARTY_ENABLE_SIMULATOR=true`

Example local `.env.local`:

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
```

Local webhook testing:

1. Expose your local Next.js app through an HTTPS tunnel.
2. Set `APP_URL` to that public HTTPS URL.
3. Register the Telegram webhook against your tunnel:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$APP_URL/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET_TOKEN"
```

4. Open your game dashboard, click the Telegram bind link for the player, and start the bot in Telegram.

### Production Telegram-ready setup

Use this when you want the normal web flow deployed for real players.

1. Deploy the Next.js app behind HTTPS.
2. Configure persistent storage:
   - `POSTGRES_URL` or `DATABASE_URL` for game state
   - `BLOB_READ_WRITE_TOKEN` for uploaded evidence
3. Configure the Telegram bot env vars:
   - `TELEGRAM_BOT_TOKEN` for the server-side Telegram Bot API integration
   - `TELEGRAM_BOT_USERNAME` for server-side bot metadata and link generation
   - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` if the client should render the public bot link directly
   - `TELEGRAM_BINDING_ENCRYPTION_KEY` to encrypt Telegram identifiers and hashes at rest
   - `TELEGRAM_WEBHOOK_SECRET_TOKEN` to authenticate Telegram webhook calls
   - `APP_URL` so Telegram messages can link players back into the deployed app
4. Register the Telegram webhook to point at `https://your-domain/api/telegram/webhook`.
5. Keep the simulator disabled unless you explicitly want it:
   - `PIXELPARTY_ENABLE_SIMULATOR=false`
6. Create a bot with BotFather if you want Telegram to be the entrypoint into the web app.
7. Ask every player to start the bot once in Telegram.
8. Point the bot menu button, deep link, or Web App button at your deployed HTTPS app URL.
9. Require players to enter the same Telegram handle they use in Telegram when they join the non-simulator flow.
10. Have each player click the bind link from their game dashboard once so the bot can associate their Telegram chat with their in-game identity.

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
PIXELPARTY_ENABLE_SIMULATOR=false
```

Production behavior today:

- the app reads `TELEGRAM_BOT_TOKEN` on the server
- the app can verify the configured bot through `GET /api/telegram/bot`
- the app can render a public bot CTA from `TELEGRAM_BOT_USERNAME` or `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- the app accepts Telegram webhook updates through `POST /api/telegram/webhook`
- the app stores Telegram chat IDs and Telegram identifiers encrypted at rest
- the app sends `telegram-ready` game messages to bound Telegram chats
- Telegram is now used as identity context, bot entrypoint, binding mechanism, and gameplay delivery channel for the `telegram-ready` message stream

Webhook registration example:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$APP_URL/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET_TOKEN"
```

### Syncing GitHub secrets into Vercel env vars

If you are storing the production bot token in GitHub repository secrets, this repo now includes [`.github/workflows/sync_env_variables.yml`](.github/workflows/sync_env_variables.yml) to upsert production Vercel env vars from GitHub Actions.

Set these GitHub repository secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET_TOKEN`
- `TELEGRAM_BINDING_ENCRYPTION_KEY`
- `APP_URL`
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID`

Notes:

- `VERCEL_TEAM_ID` is only needed if the Vercel project belongs to a team; omit it for personal projects
- the workflow writes `TELEGRAM_BOT_TOKEN` to Vercel as a secret environment variable
- the workflow writes both `TELEGRAM_BOT_USERNAME` and `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` to Vercel for production
- the workflow also writes `TELEGRAM_WEBHOOK_SECRET_TOKEN`, `TELEGRAM_BINDING_ENCRYPTION_KEY`, `APP_URL`, and `NEXT_PUBLIC_APP_URL`
- after changing the GitHub secrets, run the `Sync Repository Secrets To Vercel Env` workflow manually from GitHub Actions so Vercel picks up the rotated values

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
