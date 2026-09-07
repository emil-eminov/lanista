import { expect, test } from '@playwright/test'

/**
 * A failed request for an external resource is not a bug in the game: the test
 * sandbox has no route to fonts.googleapis.com, and a real player who cannot
 * reach it should still get a readable page from the fallback stack. Script
 * errors stay strict, because those are ours.
 */
const isOurFault = (text: string): boolean =>
  !/Failed to load resource|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|net::/i.test(text)

test('boots to a briefing with no console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' && isOurFault(msg.text())) errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })

  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([])
  expect(await page.evaluate(() => window.__lanista!.phase())).toBe('BRIEFING')
  await expect(page.locator('[data-begin]')).toBeVisible()
})

test('a card can be played, and it changes the fight', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })
  await page.locator('[data-begin]').click()

  await expect(page.locator('.card')).toHaveCount(5)
  const before = await page.evaluate(() => window.__lanista!.state())
  // Click the first playable card rather than any card, so a full hand of
  // unaffordable cards cannot make this pass by doing nothing.
  await page.locator('.card:not([disabled])').first().click()
  const after = await page.evaluate(() => window.__lanista!.state())
  // Counting cards that have left the hand, not hand size: Sidestep and Second
  // Wind draw a replacement, so hand size can be unchanged after a real play.
  expect(after.played).toBeGreaterThan(before.played)
})

test('the crowd falls when a turn is spent doing nothing showy', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })
  await page.locator('[data-begin]').click()
  const before = (await page.evaluate(() => window.__lanista!.state())).favor
  await page.locator('[data-endturn]').click()
  const after = (await page.evaluate(() => window.__lanista!.state())).favor
  expect(after).toBeLessThan(before)
})

test('a whole season can be played through to an ending', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })
  await page.evaluate(() => window.__lanista!.auto())
  await page.waitForFunction(() => window.__lanista!.phase() === 'OVER', null, { timeout: 30_000 })
  await expect(page.locator('[data-newrun]')).toBeVisible()
  expect(errors, `errors: ${errors.join(' | ')}`).toEqual([])
})

test('the arena reads on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })
  await page.locator('[data-begin]').click()
  await page.locator('.card:not([disabled])').first().click()
  await page.waitForTimeout(800)
  expect(await page.screenshot()).toMatchSnapshot('fight-portrait.png', { maxDiffPixelRatio: 0.05 })
})
