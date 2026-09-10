# Lanista

A gladiator school you run day by day. You are the lanista, and you are
permanent. Your fighters are not.

Buy them at the market, keep them fed and rested so they can train, hire them
out when coin runs short, and send them to the arena when they are ready.

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

## The day is the resource

Every gladiator does exactly one thing per day: train a stat, rest, feast, or
hire out. Training is gated behind being both rested and fed, so feeding and
resting are not chores bolted on beside training. They are what buys it. The
food bill falls due every day whether or not you can pay, and a fighter who
runs out of food eventually starves.

A bout costs a day too, which is what makes the arena compete with the gym.

## Making money

Five ways, because the purse alone does not cover a school:

- **Arena purses**, multiplied by crowd favour. A dull win pays a third of a
  loud one.
- **Hiring a fighter out** for guard work. Safe, small, and it costs condition.
- **A patron's retainer** once your fame passes a threshold, paid weekly.
- **Selling a trained fighter** for more than you paid. Buying cheap, training,
  and selling on is the actual business of a lanista, so the buy price and the
  sell price come from the same valuation with a margin between them.
- **Not dying**, which is cheaper than replacing anyone.

## Faces

Every gladiator's portrait is generated as SVG from their seed: helmet, plume,
skin, scars and weapon. The four classes have deliberately different
silhouettes, since a silhouette is how a class is recognised at roster size. The
retiarius wears no helmet, so he gets an actual face, or he reads as a blob.

## What persists

Gladiators are mortal, the ludus is not. Coin, fame, the day count and the names
of the dead all survive, stored locally.

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

## Interface rules this project holds itself to

Checked by tests in `e2e/smoke.spec.ts`, not by eye:

- **Every control is at least 44x44px with 8px between it and its neighbour.**
  The day actions were 28px tall and 5px apart, which is under every platform
  minimum and they are the most-used control in the game.
- **Keyboard focus is visible.** Every button had `border: 0` and no focus
  style, so a keyboard user had no idea where they were.
- **No horizontal scroll at 375px**, the narrowest common phone.
- **`prefers-reduced-motion` is respected**, which the shake and float
  animations previously ignored.
- **Body text stays at or above 12.5px**, and muted text was lightened to clear
  4.5:1 against the panel. Borders got their own token so lightening the text
  did not lighten every hairline with it.
- **Icons are inline SVG, never emoji**, drawn in `src/ui/icons.ts` because the
  game ships as one offline file and cannot fetch an icon set.
- **Four controls per fighter, not six.** The three training options stay folded
  behind Train, since six fighters times six buttons is 36 targets on one screen.
- **Navigation sits at the bottom**, where a thumb can reach it on a tall phone.
