const { Run } = await import('../src/game/run.ts')
const { botFight, botChooseReward } = await import('../src/game/bot.ts')

function playRun(seed) {
  const run = new Run(seed)
  let guard = 0
  const favors = []
  while (run.phase !== 'OVER' && guard++ < 100) {
    if (run.phase === 'BRIEFING') { run.beginFight(); continue }
    if (run.phase === 'FIGHT') {
      botFight(run.combat)
      favors.push(Math.round(run.combat.favor))
      run.settle()
      continue
    }
    if (run.phase === 'REWARD') { run.takeReward(botChooseReward(run.rewards, run.hp, run.maxHp)); continue }
  }
  return { run, favors }
}

let wins = 0, deaths = 0, mercies = 0
const fightCounts = [], allFavor = []
for (let seed = 1; seed <= 40; seed++) {
  const { run, favors } = playRun(seed)
  const r = run.result
  fightCounts.push(r.fightsWon)
  allFavor.push(...favors)
  if (r.fightsWon >= 8) wins++
  else if (r.survived) mercies++
  else deaths++
}
const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)
console.log(`40 runs: ${wins} seasons won, ${mercies} spared, ${deaths} killed`)
console.log(`fights won: avg ${avg(fightCounts)}, min ${Math.min(...fightCounts)}, max ${Math.max(...fightCounts)}`)
console.log(`favour at fight end: avg ${avg(allFavor)}, min ${Math.min(...allFavor)}, max ${Math.max(...allFavor)}`)
