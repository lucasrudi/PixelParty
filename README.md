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
- Two-player validation before a quest is marked complete and points are awarded
- A final scoreboard with player titles and an epic wrap-up
- A `/simulator` route where players can join using names only and test the full lifecycle locally

## Important Telegram Constraint

This project stores Telegram handles and creates Telegram-ready messages in the game feed, but it does not yet push real Telegram bot DMs. Telegram bots cannot reliably message users from just a username; each player must start the bot once so the app can bind the handle to a chat ID.

## Run Locally

```bash
cd /Users/lucasrudi/dev/PixelParty
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Main Routes

- `/` — landing page and Telegram-ready game creation
- `/join/[inviteCode]` — public lobby join page
- `/game/[gameId]?player=PLAYER_ID` — player dashboard
- `/simulator` — local names-only simulator

## Validation

```bash
npm run lint
npm run build
```

## Persistence

Game state is stored in `.data/games.json` while the app runs locally. Uploaded proof files are stored in `public/uploads/`. Both are ignored by git.
