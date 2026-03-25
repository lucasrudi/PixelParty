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
2. Run the app with persistent storage for:
   - `.data/games.json`
   - `public/uploads/`
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

## Deploying The Next.js App

This project can be deployed like a normal Next.js app, but there is one important caveat: the current MVP writes game state and uploads to the local filesystem.

### Recommended deployment shape

Use a Node.js host where the app can run with persistent disk storage, for example:

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

The deployment must preserve these paths between restarts and redeploys:

- `.data/games.json`
- `public/uploads/`

If those paths are ephemeral, game progress and uploaded evidence will be lost.

### Environment and networking checklist

Before going live, make sure the server has:

- Node.js installed
- outbound internet access for user-uploaded proof URLs and future integrations
- an HTTPS public domain
- enough writable disk space for `.data/` and `public/uploads/`

### Important hosting note

This app is not yet a good fit for fully ephemeral serverless deployments out of the box. Platforms that rebuild or replace the filesystem on each deploy will need a storage rewrite first, typically:

- move game state from `.data/games.json` into a database
- move uploaded files from `public/uploads/` into object storage

Once those two pieces are externalized, the app will be much easier to run on serverless Next.js platforms.

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

Game state is stored in `.data/games.json` while the app runs locally. Uploaded proof files are stored in `public/uploads/`. Both are ignored by git.
