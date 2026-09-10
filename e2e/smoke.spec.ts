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
  // Two taps by design: the three training options stay folded behind Train so
  // a fighter shows four controls at rest rather than six.
  await page.locator('[data-assign$=":train"]').first().click()
  await expect(page.locator('[data-assign$=":might"]')).toBeVisible()
  await page.locator('[data-assign$=":might"]').first().click()
  await expect(page.locator('.assigned')).toContainText(/training might/i)
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

test('every control is big enough and far enough apart to hit with a thumb', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })

  // 44px is the iOS minimum and the strictest of the platform rules; the day
  // actions were 28px tall before this pass.
  const boxes = await page.locator('.tag, .nav button, .btn').evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect()
      return { text: (n.textContent ?? '').trim().slice(0, 20), h: Math.round(r.height), w: Math.round(r.width) }
    }),
  )
  expect(boxes.length).toBeGreaterThan(3)
  for (const box of boxes) {
    expect(box.h, `"${box.text}" is only ${box.h}px tall`).toBeGreaterThanOrEqual(44)
    expect(box.w, `"${box.text}" is only ${box.w}px wide`).toBeGreaterThanOrEqual(44)
  }

  // No horizontal scroll at the narrowest common phone width.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, 'the page scrolls sideways at 375px').toBeLessThanOrEqual(0)
})

test('keyboard focus is visible on the controls', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__lanista !== undefined, null, { timeout: 30_000 })
  await page.keyboard.press('Tab')
  const outline = await page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const style = getComputedStyle(el)
    return { width: style.outlineWidth, style: style.outlineStyle }
  })
  expect(outline, 'nothing took focus on Tab').not.toBeNull()
  // Every button had border:0 and no focus style before this pass.
  expect(outline!.style).not.toBe('none')
  expect(parseFloat(outline!.width)).toBeGreaterThan(0)
})
