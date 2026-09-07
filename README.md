# Lanista

A gladiator deckbuilder. You are the lanista, and you are permanent. A run is
one gladiator's career through a season of eight fights.

## The hook: the crowd

Winning the fight is not the same as winning the arena. A favour meter rises
when you fight showily and falls, actively, on any turn you spend only
guarding. It does two things:

- It sets the purse. A dull win pays half what a loud one does.
- It decides whether losing costs you the season or the fighter. Lose with the
  crowd behind you and the editor grants missio; lose without them and the
  gladiator dies and stays dead.

That puts a knife in every turn. Playing safe keeps you alive this fight and
may kill you at the end of it.

It also fixes a genre problem: block-forever is the degenerate strategy in most
deckbuilders, and here the crowd punishes it directly.

## What persists

Gladiators are mortal, the ludus is not. Coin, fame, seasons run, and the names
of the dead survive every run and are stored locally.

## Working on it

```
npm install
npm run dev          # play at the printed localhost URL
npm run verify       # typecheck + lint + unit tests, including balance guards
npm run test:e2e     # browser tests; needs LANISTA_CHROMIUM set to a Chromium binary
node scripts/build-single.mjs out.html    # one file, about 29KB
```

Build output goes to `~/lanista-build/dist`, outside this folder, because the
folder is mounted without delete permission and Vite cannot clear an out-dir
inside it.

## The bot

`src/game/bot.ts` plays whole seasons so balance can be tested in CI. It cost
one wrong conclusion to get right: the first version always took the first
reward, never once chose to rest, and then reported the season as unwinnable.
A bad test subject produces confident, wrong data.

Current measured balance across 40 bot seasons: 2 won, 20 spared by the crowd,
18 killed. The bot is worse than a person, so treat that as the floor.

## Design notes

- Cards are typography, since there is no artist. Cinzel for anything carved or
  announced, Barlow for anything read quickly, loaded from Google Fonts with a
  real fallback stack so a blocked font still leaves a readable page.
- No dependencies at runtime. About 29KB as a single self-contained file.
