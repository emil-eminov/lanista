import { expect, test } from '@playwright/test'

/**
 * A failed request for an external resource is not a bug in the game: the test
 * sandbox has no route to fonts.googleapis.com, and a player who cannot reach
 * it should still get a readable page from the fallback stack. Script errors
 * stay strict, because those are ours.
 */
const isOurFault = (text: string): boolean =>
  !/Failed to load resource|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|net::/i.test(text)

/** Each test gets a fresh school; the game saves to localStorage between visits. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
})

test('opens on the ludus with a fighter and no script errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' && isOurFault(msg.text())) errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })

  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([])
  expect(await page.evaluate(() => window.__lanista!.screen())).toBe('ludus')
  await expect(page.locator('.fighter')).toHaveCount(1)
  // The portrait is generated, so its presence proves the drawing code ran.
  await expect(page.locator('.fighter .portrait-svg')).toBeVisible()
})

test('a day passes, costs the food bill, and training raises a stat', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })

  const before = await page.evaluate(() => window.__lanista!.state())
  await page.locator('[data-assign$=":might"]').first().click()
  await page.locator('[data-nextday]').click()
  const after = await page.evaluate(() => window.__lanista!.state())

  expect(after.day).toBe(before.day + 1)
  expect(after.coin).toBeLessThan(before.coin)
  await expect(page.locator('.notes')).toContainText(/trains|tired|hungry/i)
})

test('the market sells fighters, priced by what they are worth', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })
  await page.locator('[data-tab="market"]').click()

  await expect(page.locator('[data-buy]')).toHaveCount(3)
  const prices = await page.locator('[data-buy]').allInnerTexts()
  // Case-insensitive: the button label is uppercased by CSS, and innerText
  // reports what is rendered rather than what the markup says.
  for (const price of prices) expect(price).toMatch(/buy for \d+/i)
})

test('a bout can be fought to the end and settles into the school', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })
  await page.locator('[data-tab="arena"]').click()
  await page.locator('[data-choose]').first().click()
  await page.locator('[data-fight]:not([disabled])').first().click()

  expect(await page.evaluate(() => window.__lanista!.screen())).toBe('fight')
  await expect(page.locator('.card')).toHaveCount(5)

  // End turns until the fight resolves rather than playing it well: this checks
  // that a bout terminates and settles, not that it can be won.
  await page.evaluate(() => window.__lanista!.autoFight())
  await page.waitForFunction(() => window.__lanista!.screen() === 'aftermath', null, { timeout: 20_000 })
  await expect(page.locator('[data-back]')).toBeVisible()

  await page.locator('[data-back]').click()
  expect(await page.evaluate(() => window.__lanista!.screen())).toBe('ludus')
  expect(errors, `errors: ${errors.join(' | ')}`).toEqual([])
})

test('the ludus reads on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })
  await page.waitForTimeout(500)
  expect(await page.screenshot()).toMatchSnapshot('ludus-portrait.png', { maxDiffPixelRatio: 0.05 })
})

test('a fight reads on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })
  await page.locator('[data-tab="arena"]').click()
  await page.locator('[data-choose]').first().click()
  await page.locator('[data-fight]:not([disabled])').first().click()
  await page.locator('.card:not([disabled])').first().click()
  await page.waitForTimeout(800)
  expect(await page.screenshot()).toMatchSnapshot('fight-portrait.png', { maxDiffPixelRatio: 0.05 })
})
