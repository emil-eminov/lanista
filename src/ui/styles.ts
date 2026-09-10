/**
 * Sand, blood and bronze. Cinzel for anything carved or announced, Barlow for
 * anything read quickly. Cards are typography, so the type does the work that
 * illustration would do in a game with an artist.
 */
export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap');

:root {
  --sand: #d8c096;
  --sand-dim: #a48f6c;
  --ground: #17120e;
  --panel: #221a14;
  --panel-lit: #2d231a;
  --blood: #a8322a;
  --blood-lit: #d4453a;
  --bronze: #c08a3e;
  --bone: #f0e7d6;
  --gold: #e8b93f;
  --steel: #7d8a8f;
  --display: 'Cinzel', Georgia, serif;
  --body: 'Barlow', system-ui, -apple-system, sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(120% 80% at 50% 0%, #2a2018 0%, var(--ground) 60%),
    var(--ground);
  color: var(--bone);
  font-family: var(--body);
  -webkit-user-select: none;
  user-select: none;
  overscroll-behavior: none;
}

#app {
  max-width: 560px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: max(env(safe-area-inset-top), 10px) 12px max(env(safe-area-inset-bottom), 10px);
  gap: 10px;
}

button { font: inherit; color: inherit; border: 0; background: none; touch-action: manipulation; }

.eyebrow {
  font-family: var(--display);
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--sand-dim);
}

/* Opponent */
.foe { background: var(--panel); border-radius: 14px; padding: 12px 14px; display: grid; gap: 8px; }
.foe .name { font-family: var(--display); font-size: 19px; letter-spacing: 0.03em; }
.foe .row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.intent {
  display: inline-flex; align-items: center; gap: 7px; padding: 6px 11px; border-radius: 999px;
  background: #3a201c; color: #ffb9a8; font-weight: 600; font-size: 14px;
}
.intent.block { background: #1e2a2e; color: #a9d3e0; }
.intent.buff { background: #2c2718; color: var(--gold); }
.intent.debuff { background: #2a1f2e; color: #d9b3e8; }

.meter { height: 12px; border-radius: 8px; background: #0e0b09; overflow: hidden; }
.meter > i { display: block; height: 100%; transition: width 180ms ease; }
.meter.hp > i { background: linear-gradient(90deg, var(--blood), var(--blood-lit)); }
.meter.mine > i { background: linear-gradient(90deg, #4c7f4a, #7fc06f); }
.numbers { font-variant-numeric: tabular-nums; font-weight: 600; font-size: 14px; color: var(--sand); }

/* The crowd: the loudest element on the screen, because it is the hook. */
.crowd { display: grid; gap: 6px; padding: 10px 14px; border-radius: 14px; background: var(--panel); }
.crowd .bar { height: 16px; border-radius: 9px; background: #0e0b09; overflow: hidden; position: relative; }
.crowd .bar > i {
  display: block; height: 100%;
  background: linear-gradient(90deg, #6b4a12, var(--gold));
  transition: width 220ms ease;
}
.crowd .bar .mark { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--bone); opacity: 0.55; }
.crowd .caption { display: flex; justify-content: space-between; font-size: 12px; color: var(--sand-dim); }
.crowd.loved .bar > i { box-shadow: 0 0 14px #e8b93f88; }

.statuses { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { font-size: 12px; font-weight: 600; padding: 3px 8px; border-radius: 7px; background: #0f0c09; color: var(--sand); }
.chip.bleed { color: #ff9a8f; }
.chip.edge { color: var(--gold); }
.chip.stagger { color: var(--steel); }
.chip.block { color: #a9d3e0; }

/*
 * The arena floor. This space used to be empty, which made a tall phone look
 * like a form with a gap in it. Sand, a long shadow and a scrim under the log
 * turn the same pixels into a place.
 */
.arena-floor {
  flex: 1; position: relative; display: grid; align-content: end; gap: 4px;
  padding: 12px 12px 10px; min-height: 120px; border-radius: 14px; overflow: hidden;
  background:
    radial-gradient(130% 80% at 50% 108%, #c9a86e 0%, #9c7f4e 38%, #5c4830 72%, #33281a 100%),
    var(--panel);
  box-shadow: inset 0 14px 30px #00000080, inset 0 0 0 1px #ffffff12;
}
/* Sand grain, drawn with a repeating gradient rather than an image. */
.arena-floor::before {
  content: ''; position: absolute; inset: 0; opacity: 0.07; pointer-events: none;
  background-image: repeating-linear-gradient(97deg, #000 0 1px, transparent 1px 3px),
    repeating-linear-gradient(13deg, #fff 0 1px, transparent 1px 4px);
}
.arena-floor .line { position: relative; text-shadow: 0 1px 4px #000e, 0 0 12px #0008; }
.line { font-size: 13px; color: #f3e7cd; }
.line.player { color: #fff3dc; font-weight: 600; }
.pop {
  position: absolute; left: 50%; top: 30%; transform: translateX(-50%);
  font-family: var(--display); font-size: 30px; color: var(--blood-lit);
  text-shadow: 0 2px 10px #000; pointer-events: none; animation: rise 700ms ease-out forwards;
}
.pop.mine { color: var(--gold); }
@keyframes rise { to { transform: translate(-50%, -46px); opacity: 0; } }
@keyframes shake { 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
.shake { animation: shake 160ms; }

/* Player bar */
.me { background: var(--panel); border-radius: 14px; padding: 10px 14px; display: grid; gap: 7px; }
.me .row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.energy { font-family: var(--display); font-size: 17px; color: var(--gold); }

/* Hand */
.hand { display: flex; gap: 7px; justify-content: center; align-items: flex-end; min-height: 156px; padding-top: 4px; }
.card {
  width: 96px; min-height: 136px; border-radius: 12px; padding: 9px;
  background: linear-gradient(180deg, var(--panel-lit), var(--panel));
  box-shadow: inset 0 0 0 1px #ffffff14, 0 6px 14px #0008;
  /* Title sits directly under the cost row and the text directly under that;
     the slack goes to the bottom, so a one-line card and a three-line card
     still line up along their tops. */
  display: grid; grid-template-rows: auto auto 1fr; gap: 5px; text-align: left;
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.card:active { transform: translateY(-8px); }
.card.attack { box-shadow: inset 0 0 0 1px #a8322a66, 0 6px 14px #0008; }
.card.guard { box-shadow: inset 0 0 0 1px #7d8a8f66, 0 6px 14px #0008; }
.card.flourish { box-shadow: inset 0 0 0 1px #e8b93f88, 0 6px 18px #0009; }
.card.skill { box-shadow: inset 0 0 0 1px #4c7f4a66, 0 6px 14px #0008; }
.card[disabled] { opacity: 0.4; }
.card .top { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.card .cost {
  width: 21px; height: 21px; border-radius: 50%; background: var(--gold); color: #241a09;
  font-weight: 700; font-size: 13px; display: grid; place-content: center;
}
.card .fav { font-size: 11px; font-weight: 700; color: var(--gold); }
.card .fav.neg { color: #ff9a8f; }
.card .title { font-family: var(--display); font-size: 13px; line-height: 1.15; }
.card .text { font-size: 12px; line-height: 1.3; color: var(--sand); font-weight: 500; }

.actions { display: flex; gap: 8px; }
.btn {
  flex: 1; padding: 14px; border-radius: 12px; background: var(--bronze); color: #221703;
  font-family: var(--display); font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase;
}
.btn.ghost { background: #ffffff12; color: var(--bone); }
.btn:active { transform: translateY(2px); }

/* Full-screen moments */
.screen { display: grid; gap: 16px; align-content: center; justify-items: center; flex: 1; text-align: center; padding: 18px 6px; }
.screen h1 { font-family: var(--display); font-size: 30px; margin: 0; letter-spacing: 0.04em; }
.screen h2 { font-family: var(--display); font-size: 20px; margin: 0; color: var(--sand); font-weight: 600; }
.screen p { margin: 0; color: var(--sand-dim); max-width: 34ch; line-height: 1.5; }
.picks { display: grid; gap: 10px; width: min(420px, 92vw); }
.pick {
  display: grid; gap: 3px; text-align: left; padding: 14px 16px; border-radius: 14px;
  background: var(--panel); box-shadow: inset 0 0 0 1px #ffffff12;
}
.pick b { font-family: var(--display); font-size: 16px; }
.pick span { font-size: 13px; color: var(--sand); }
.pick:active { background: var(--panel-lit); }
.tomb { display: grid; gap: 4px; font-size: 13px; color: var(--sand-dim); }
.ledger { display: flex; gap: 18px; font-variant-numeric: tabular-nums; color: var(--sand); font-weight: 600; }

/* ---- The school ---------------------------------------------------- */

.top { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 8px 12px;
  background: var(--panel); border-radius: 12px; }
.top div { display: grid; gap: 1px; }
.top b { font-family: var(--display); font-size: 17px; font-variant-numeric: tabular-nums; }

.nav { display: flex; gap: 6px; }
.nav button { flex: 1; padding: 10px; border-radius: 10px; background: #ffffff0d;
  font-family: var(--display); font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sand-dim); }
.nav button.on { background: var(--bronze); color: #211602; }

.scroll { flex: 1; overflow-y: auto; display: grid; gap: 10px; align-content: start;
  padding-bottom: 6px; -webkit-overflow-scrolling: touch; }
.section { padding-top: 6px; }
.empty { color: var(--sand-dim); font-size: 14px; margin: 0; }

.fighter { display: grid; grid-template-columns: 72px 1fr; gap: 11px; background: var(--panel);
  border-radius: 14px; padding: 11px; box-shadow: inset 0 0 0 1px #ffffff0d; }
.fighter.dead { opacity: 0.45; }
.face { width: 72px; height: 72px; }
.portrait-svg { width: 100%; height: 100%; display: block; }
.who { display: grid; gap: 6px; align-content: start; min-width: 0; }
.who .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.who b { font-family: var(--display); font-size: 16px; }
.stats { display: flex; gap: 10px; font-size: 12px; font-weight: 700; color: var(--gold);
  font-variant-numeric: tabular-nums; }
.gauges { display: grid; gap: 4px; }
.gauge { display: grid; grid-template-columns: 42px 1fr; gap: 8px; align-items: center;
  font-size: 11px; color: var(--sand-dim); }
.gauge .meter { height: 7px; }
.meter.tired > i { background: linear-gradient(90deg, #6b5a2e, #d8a13a); }
.meter.fed > i { background: linear-gradient(90deg, #3f6b4a, #74c98a); }
.tiny { font-size: 11.5px; color: var(--sand-dim); font-variant-numeric: tabular-nums; }
.warn { font-size: 12px; color: #ffb0a2; font-weight: 600; }

.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.tag { padding: 6px 9px; border-radius: 8px; background: #ffffff0f; font-size: 12px; font-weight: 600;
  color: var(--sand); }
.tag.on { background: var(--gold); color: #241a09; }
.tag[disabled] { opacity: 0.35; }

.offer { display: grid; gap: 8px; }
.sellrow { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  background: var(--panel); border-radius: 12px; padding: 10px 12px; }
.sellrow .btn { flex: 0 0 auto; padding: 9px 14px; font-size: 12px; }

.picker { display: flex; gap: 8px; flex-wrap: wrap; }
.pickface { width: 78px; display: grid; gap: 4px; justify-items: center; padding: 6px; border-radius: 12px;
  background: #ffffff08; font-size: 11px; color: var(--sand); }
.pickface svg { width: 62px; height: 62px; }
.pickface.on { background: var(--bronze); color: #211602; }

.notes { display: grid; gap: 3px; background: #ffffff08; border-radius: 12px; padding: 10px 12px;
  font-size: 13px; color: var(--sand); }
.notes.graves { color: var(--sand-dim); }

.bigface { width: 128px; height: 128px; }
/* display:block matters: a span is inline, and width and height do not
   apply to inline boxes, so the fighter's portrait rendered at zero size. */
.mini { display: block; width: 34px; height: 34px; flex: 0 0 auto; }
.mini svg { width: 100%; height: 100%; }
`
